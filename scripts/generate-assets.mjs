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
  ['Design - Spelling Bee', 'Design'],
  ['Design - West Side Story', 'Design'],
  ['Designs - Mr. Burns', 'Design'],
  ['Rent - Design', 'Design'],
  ['Builds - Abstract Ideas ', 'Builds'],
  ['Builds -  Moana', 'Builds'],
  ['Builds - Kabuki ', 'Builds'],
  ['Builds - Mulan ', 'Builds'],
  ['Builds - Puana ', 'Builds'],
  ['Builds - Rent ', 'Builds'],
  ['Builds - Design - 4.48 Psychosis', 'Design'],
  ['Builds - Designs - AWTYB ', 'Design'],
  ['Builds - Designs - Water Station', 'Design'],
  ['Builds - Glitter in the Pā’a’kai', 'Builds'],
  ['Builds - Dance Dance Dance ', 'Builds'],
  ['Builds - Tutu Base', 'Builds'],
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

const allowed = new Set(['.jpg', '.jpeg', '.png', '.heic', '.webp', '.tif', '.tiff']);

const numericRank = (name) => {
  const match = basename(name).match(/^(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 999;
};

const projectDescription = (title, category) => {
  const role =
    category === 'Design'
      ? 'costume design, visual research, and production storytelling'
      : category === 'Skills'
        ? 'specialty costume craft, finish work, and process documentation'
        : 'costume construction, stitching, alterations, and build process';
  return `${title} documentation featuring ${role}. Replace this placeholder with production credits, venue, director, role, year, and collaborators when available.`;
};

const convertImage = async (source, outDir, baseName, index) => {
  const resize = { width: index === 0 ? 1300 : 1100, height: index === 0 ? 1500 : 1300, fit: 'inside', withoutEnlargement: true };
  const imageName = `${baseName}.jpg`;
  const imageOut = join(outDir, imageName);

  if (extname(source).toLowerCase() === '.heic') {
    const thumbDir = join(tmpdir(), `caitlin-heic-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    await mkdir(thumbDir, { recursive: true });
    await run('qlmanage', ['-t', '-s', String(resize.width), '-o', thumbDir, source]);
    const thumbnail = join(thumbDir, `${basename(source)}.png`);
    await sharp(thumbnail).resize(resize).jpeg({ quality: 86, mozjpeg: true }).toFile(imageOut);
    await rm(thumbDir, { recursive: true, force: true });
    return imageName;
  }

  try {
    await sharp(source).rotate().resize(resize).jpeg({ quality: 86, mozjpeg: true }).toFile(imageOut);
    return imageName;
  } catch (error) {
    throw error;
  }
};

await mkdir(publicAssets, { recursive: true });
await mkdir(publicDocs, { recursive: true });

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
    .filter((file) => allowed.has(extname(file).toLowerCase()))
    .sort((a, b) => numericRank(a) - numericRank(b) || a.localeCompare(b))
    .slice(0, 8);
  if (!files.length) continue;

  const title = titleFromFolder(folder);
  const slug = slugify(title);
  const outDir = join(publicAssets, 'projects', slug);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const images = [];
  for (const [index, file] of files.entries()) {
    const source = join(dir, file);
    const baseName = String(index + 1).padStart(2, '0');
    try {
      const outName = await convertImage(source, outDir, baseName, index);
      images.push({
        src: `public/assets/projects/${slug}/${outName}`,
        alt: `${title} portfolio image ${index + 1}`,
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
      description: projectDescription(title, category),
      images,
    });
  }
}

const source = `export const projects = ${JSON.stringify(projects, null, 2)};\n`;
await writeFile(join(root, 'src', 'project-data.js'), source);
console.log(`Generated ${projects.length} projects and ${projects.reduce((total, project) => total + project.images.length, 0)} images.`);
