import { copyFile, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const run = promisify(execFile);

const root = process.cwd();
const publicAssets = join(root, 'public', 'assets');
const publicDocs = join(root, 'public', 'docs');
const sourceRoot = join(root, 'Portfolio');

const entries = [
  ['Rent - Design', 'Design'],
  ['Builds - Designs - AWTYB ', 'Design + Build'],
  ['Builds - Design - 4.48 Psychosis', 'Design + Build'],
  ['Design - Spelling Bee', 'Design'],
  ['Design - West Side Story', 'Design'],
  ['Designs - Mr. Burns', 'Design'],
  ['Builds - Designs - Water Station', 'Design + Build'],
  ['Builds - Rent ', 'Builds'],
  ['Builds - Puana ', 'Builds'],
  ['Builds - Mulan ', 'Builds'],
  ['Builds - Glitter in the Pā’a’kai', 'Builds'],
  ['Builds - Kabuki ', 'Builds'],
  ['Builds -  Moana', 'Builds'],
  ['Builds - Abstract Ideas ', 'Builds'],
  ['Builds - Corset 1 (combine with 1-3)', 'Skills'],
  ['Builds - Corset 2 (combine)', 'Skills'],
  ['Builds - Corset 3 (combine)', 'Skills'],
  ['Skills - Makeup', 'Skills'],
  ['Skills - Millinery', 'Skills'],
  ['Skills - Specialty Dressing ', 'Skills'],
  ['Skills - Specialty Dye', 'Skills'],
];

const titleFromFolder = (folder) =>
  folder
    .replace(/^Builds -\s*/i, '')
    .replace(/^Designs? -\s*/i, '')
    .replace(/^Skills -\s*/i, '')
    .replace(/\s*\(combine.*?\)/i, '')
    .trim();

const slugify = (value) =>
  value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

const imageExtensions = new Set(['', '.jpg', '.jpeg', '.png', '.heic', '.webp', '.tif', '.tiff']);
const videoExtensions = new Set(['.mov', '.mp4', '.m4v']);

const numericRank = (name) => {
  const match = basename(name).match(/^(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 999;
};

const projectDescription = (title, category) => {
  const role =
    category === 'Design'
      ? 'costume design, visual research, and production storytelling'
      : category === 'Design + Build'
        ? 'costume design, construction, visual research, and production storytelling'
      : category === 'Skills'
        ? 'specialty costume craft, finish work, and process documentation'
        : 'costume construction, stitching, alterations, and build process';
  return `${title} documentation featuring ${role}. Replace this placeholder with production credits, venue, director, role, year, and collaborators when available.`;
};

const moveImageToFront = (project, filename) => {
  const index = project?.images.findIndex((image) => image.src.endsWith(`/${filename}`)) ?? -1;
  if (index > 0) {
    const [image] = project.images.splice(index, 1);
    project.images.unshift(image);
  }
};

const curateProjects = (projectList) => {
  const bySlug = new Map(projectList.map((project) => [project.slug, project]));
  moveImageToFront(bySlug.get('abstract-ideas'), '02.jpg');
  moveImageToFront(bySlug.get('moana'), '05.jpg');
  moveImageToFront(bySlug.get('millinery'), '05.jpg');

  const maidenBenten = bySlug.get('kabuki');
  if (maidenBenten) {
    maidenBenten.title = 'The Maiden Benten and the Bandits of the White Waves';
    maidenBenten.description = maidenBenten.description.replace(/^Kabuki documentation/, 'The Maiden Benten and the Bandits of the White Waves documentation');
    maidenBenten.images = maidenBenten.images.map((image) => ({
      ...image,
      alt: image.alt.replace(/^Kabuki/, 'The Maiden Benten and the Bandits of the White Waves'),
    }));
  }

  const naturalDye = bySlug.get('specialty-dye');
  if (naturalDye) {
    naturalDye.title = 'Natural Dye';
    naturalDye.slug = 'natural-dye';
    naturalDye.description = naturalDye.description.replace(/^Specialty Dye documentation/, 'Natural Dye documentation');
    naturalDye.images = naturalDye.images.map((image) => ({
      ...image,
      alt: image.alt.replace(/^Specialty Dye/, 'Natural Dye'),
    }));
  }

  const rentDesign = bySlug.get('rent---design');
  if (rentDesign) {
    rentDesign.title = 'Rent';
    rentDesign.description = rentDesign.description.replace(/^Rent - Design documentation/, 'Rent documentation');
    rentDesign.images = rentDesign.images.map((image) => ({
      ...image,
      alt: image.alt.replace(/^Rent - Design/, 'Rent'),
    }));
  }

  const corsets = ['corset-1', 'corset-2', 'corset-3'].map((slug) => bySlug.get(slug)).filter(Boolean);
  const corsetry = {
    title: 'Corsetry',
    slug: 'corsetry',
    category: 'Skills',
    description: 'Corsetry documentation featuring specialty costume craft, finish work, and process documentation. Replace this placeholder with production credits, venue, director, role, year, and collaborators when available.',
    images: corsets.flatMap((project) =>
      project.images.map((image, index) => ({
        src: image.src,
        alt: `${project.title} corsetry portfolio image ${index + 1}`,
      })),
    ),
  };
  moveImageToFront(corsetry, '02.jpg');

  return [
    'rent---design',
    'awtyb',
    '448-psychosis',
    'spelling-bee',
    'west-side-story',
    'mr-burns',
    'water-station',
    'rent',
    'puana',
    'mulan',
    'glitter-in-the-paakai',
    'kabuki',
    'moana',
    'abstract-ideas',
  ]
    .map((slug) => bySlug.get(slug))
    .filter(Boolean)
    .concat([corsetry])
    .concat(['makeup', 'millinery', 'specialty-dressing'].map((slug) => bySlug.get(slug)).filter(Boolean))
    .concat(naturalDye ? [naturalDye] : []);
};

const convertImage = async (source, outDir, baseName, index) => {
  const resize = { width: index === 0 ? 1300 : 1100, height: index === 0 ? 1500 : 1300, fit: 'inside', withoutEnlargement: true };
  const imageName = `${baseName}.jpg`;
  const imageOut = join(outDir, imageName);

  if (['', '.heic'].includes(extname(source).toLowerCase())) {
    const thumbDir = join(tmpdir(), `caitlin-heic-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    await mkdir(thumbDir, { recursive: true });
    try {
      const qlSource = extname(source) ? source : join(thumbDir, `${basename(source)}.HEIC`);
      if (qlSource !== source) await copyFile(source, qlSource);
      await run('qlmanage', ['-t', '-s', String(resize.width), '-o', thumbDir, qlSource], { timeout: 15000 });
      const thumbnail = join(thumbDir, `${basename(qlSource)}.png`);
      await sharp(thumbnail).resize(resize).jpeg({ quality: 86, mozjpeg: true }).toFile(imageOut);
      return imageName;
    } finally {
      await rm(thumbDir, { recursive: true, force: true });
    }
  }

  try {
    await sharp(source).rotate().resize(resize).jpeg({ quality: 86, mozjpeg: true }).toFile(imageOut);
    return imageName;
  } catch (error) {
    throw error;
  }
};

const copyVideo = async (source, outDir, baseName) => {
  const extension = extname(source).toLowerCase();
  const videoName = `${baseName}${extension}`;
  await copyFile(source, join(outDir, videoName));
  return videoName;
};

await mkdir(publicAssets, { recursive: true });
await mkdir(publicDocs, { recursive: true });
await rm(join(publicAssets, 'projects'), { recursive: true, force: true });

await sharp(join(root, 'artist_image.png'))
  .resize({ width: 1200, withoutEnlargement: true })
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(join(publicAssets, 'artist-portrait.jpg'));
await copyFile(join(root, 'resume.png'), join(publicDocs, 'caitlin-chavis-resume.png'));

await writeFile(
  join(publicAssets, 'thread-mark.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#151514"/><path d="M17 45c14-4 23-14 30-29M18 19c12 3 22 13 29 29" fill="none" stroke="#d7bd88" stroke-width="4" stroke-linecap="round"/><circle cx="18" cy="19" r="5" fill="#f2eee6"/><circle cx="46" cy="45" r="5" fill="#f2eee6"/></svg>`,
);

const projects = [];

for (const [folder, category] of entries) {
  const dir = join(sourceRoot, folder);
  if (!existsSync(dir)) continue;
  const files = (await readdir(dir))
    .filter((file) => {
      const extension = extname(file).toLowerCase();
      return imageExtensions.has(extension) || videoExtensions.has(extension);
    })
    .sort((a, b) => numericRank(a) - numericRank(b) || a.localeCompare(b));
  if (!files.length) continue;

  const title = titleFromFolder(folder);
  const slug = slugify(title);
  const outDir = join(publicAssets, 'projects', slug);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const images = [];
  for (const [index, file] of files.entries()) {
    const source = join(dir, file);
    const extension = extname(file).toLowerCase();
    const baseName = String(index + 1).padStart(2, '0');
    try {
      const isVideo = videoExtensions.has(extension);
      const outName = isVideo ? await copyVideo(source, outDir, baseName) : await convertImage(source, outDir, baseName, index);
      images.push({
        src: `public/assets/projects/${slug}/${outName}`,
        alt: `${title} portfolio ${isVideo ? 'video' : 'image'} ${index + 1}`,
        type: isVideo ? 'video' : 'image',
      });
    } catch (error) {
      console.warn(`Skipped ${source}: ${error.message}`);
    }
  }

  if (images.length) {
    projects.push({
      title,
      slug,
      category,
      tags: category === 'Design + Build' ? ['Design', 'Builds'] : [category],
      description: projectDescription(title, category),
      images,
    });
  }
}

const curatedProjects = curateProjects(projects);
const source = `export const projects = ${JSON.stringify(curatedProjects, null, 2)};\n`;
await writeFile(join(root, 'src', 'project-data.js'), source);
console.log(`Generated ${curatedProjects.length} projects and ${curatedProjects.reduce((total, project) => total + project.images.length, 0)} images.`);
