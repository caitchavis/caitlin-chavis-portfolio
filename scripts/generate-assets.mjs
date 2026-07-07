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
const isHeifLikeExtension = (extension) => extension === '' || extension === '.heic' || /^\.\d+$/.test(extension);
const isImageFile = (file) => !file.startsWith('.') && (imageExtensions.has(extname(file).toLowerCase()) || /^\.\d+$/.test(extname(file).toLowerCase()));

const numericRank = (name) => {
  const match = basename(name).match(/^(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 999;
};

const projectDescription = (title, category) => {
  return '';
};

const projectDescriptions = {
  moana:
    'Directed by: Cari Taira\nDesigned by: Caitlin Chavis and Devin Walter\n\nFor this production, I collaborated on the design and construction of several principal costumes, with a focus on creating a culturally grounded interpretation of Moana while working within a limited budget. The shop prioritized the use of existing fabric stock and readily available natural materials sourced from the aina whenever possible.\n\nThe Te Ka / Te Fiti transforming dress was developed with technical inspiration drawn from Ann Hould-Ward’s transformation costume work in Into the Woods, requiring construction methods that allowed the garment to shift effectively between characters on stage.\n\nFor Maui and Moana, I helped build ti leaf paʻu using natural materials under the guidance of a Maori cultural advisor, ensuring the process and final appearance remained respectful of Pacific cultural practices. The overall design goal was to represent Hawaiʻi in a way that felt more locally rooted while supporting the storytelling and practical demands of performance.',
  'abstract-ideas':
    'Each project was inspired by the challenge of creating a garment from found objects and unconventional materials. The goal was to explore new approaches to design, experiment with construction techniques, and use material limitations as a way to generate creative ideas.',
  corsetry:
    'Each corset is constructed from coutil and reinforced with sprung steel boning. The boning is enclosed using a sandwiched construction technique, creating a smooth, clean interior - concealing the bone channels between the layers. Grommets were installed using a combination of hand-setting and a press. Lastly, all lacing is finished with plastic aglets for a clean, durable finish.',
  'glitter-in-the-paakai':
    'Part of Kennedy Theaters 2023 - 2024 MainStage production season.\nWritten and Directed by: Joshua “Baba” Kamoaniʻala Tavares\nCostume Designer: Kaneikoliaikaʻiukapuomua Baker\n\nThis romper was created for a Hana Keaka theatre production rooted in hula and moʻolelo, telling a story centered on the meaning of ʻohana. I worked closely with the costume designer to develop a silhouette that was both flattering and playful while supporting the movement required for performance and reflecting the character’s personality.\n\nThe designer created a custom textile by hand-printing pua motifs onto palaka fabric, drawing on a material deeply rooted in Hawaiʻi’s history. I was responsible for building the mock-up and constructing the final garment, refining the fit through multiple iterations and carefully pattern matching the printed fabric throughout the piece. I also explored different finishing techniques and closure methods to achieve a clean, durable garment that could withstand the demands of the stage while maintaining the designer’s artistic vision.',
  kabuki:
    'Part of Kennedy Theaters 2023 - 2024 Main stage production season\nDirected by: Julie Iezzi\n\nFor this Kabuki production, I constructed a hanten featuring screen-printed Japanese characters representing the shop where the character worked. Although a relatively simple build the project required an understanding of traditional Japanese garment construction.\n\nI also rebuilt a juban for the principal character, Benten, by carefully deconstructing and salvaging an existing garment. Working with fragile, aging silk required patience and precision, while the reconstruction relied on delicate hand stitching to preserve the garment’s traditional construction. Throughout the process, my work was reviewed and guided by Kabuki senseis, ensuring the techniques and finished garment remained true to traditional practices.',
  mulan:
    'Part of Kennedy Theaters 2024 - 2025 MainStage production season.\nWritten and Directed by: Elizabeth Ung\nCostume Designer: Kaneikoliaikaʻiukapuomua Baker\n\nFor this production of Mulan, I collaborated with the costume designer to create a Terracotta Army-inspired uniform. I draped and patterned the canvas base before fabricating individual armor tiles from Styrofoam and Worbla, which were painted to resemble weathered metal. Each tile was then hand stitched to the garment, combining traditional patternmaking with armor fabrication techniques.',
  puana:
    'Part of Kennedy Theaters 2024 - 2025 MainStage production season.\nWritten and Directed by: Tammy Hailiʻopua Baker\nCostume Designer: Kaneikoliaikaʻiukapuomua Baker\n\nFor this production, which explored the profound spiritual connection between Kanaka Maoli and their kupuna through the transformative power of song, I draped, patterned, mocked up, and constructed the garment from the designer’s rendering. Using the director’s selected fabric, I carefully planned the pattern placement to preserve the intended visual flow while achieving the silhouette and fit required for performance.',
  rent:
    'Part of Kennedy Theaters 2024 - 2025 MainStage production season.\nWritten and Directed by: Joshua “Baba” Kamoaniʻala Tavares\nCostume Designer: Caitlin Chavis\n\nFor this production, I transformed a budget Santa costume into Angel’s signature dress, completely deconstructing and restructuring the garment to create a familiar silhouette that felt as though it had been creatively recycled by the character herself. For Maureen, I focused on a handmade, expressive aesthetic, embellishing her costume with playful fabrics and beading to reflect her artistic spirit and DIY approach to self-expression.',
  '448-psychosis':
    'Part of Kennedy Theaters 2024 - 2025 MainStage production season.\nDirected by: Arlo Rowe\nCostume Designer: Caitlin Chavis\n\nThis production explored themes of mental health through a Japanese-influenced visual aesthetic. I designed the principal character’s costume by combining traditional Japanese silhouettes with subtle references to hospital garments. The robe was shortened to resemble a happi coat, the trousers were patterned after hakama, and a hospital gown-inspired fabric was incorporated to quietly foreshadow the character’s circumstances without making them immediately apparent.',
  awtyb:
    'Part of Kennedy Theaters 2023 - 2024 MainStage production season.\nDirected by: Pei-Ling Kao\nCostume Designer: Caitlin Chavis\n\nInspired by Afternoon of a Faun, this performance explored the human body, subtle sensuality, and the fluidity of gender. My design drew inspiration from natural anatomy, using appliques on mesh bodysuits to suggest the form of the body rather than explicitly reveal it. The placement of each applique was carefully considered to guide the viewer’s eye, creating the illusion of nudity while maintaining modesty and supporting the production’s artistic vision.',
  'water-station':
    'Part of Kennedy Theaters 2023 - 2024 MainStage production season.\nDirected by: Pei-Ling Kao\nCostume Designer: Caitlin Chavis\n\nI designed the costumes for an ensemble of characters whose appearance suggested lives shaped by constant travel, hinting at their journeys without defining where they had come from or where they were headed. Two key design challenges included creating the “Trash Queen,” a character who remained stationary onstage and was intended to camouflage with the set while still feeling regal, and engineering a performer-worn pack that appeared exceptionally heavy while remaining lightweight, functional, and comfortable throughout the performance.',
  millinery:
    'Created both buckram and felt hats, utilizing traditional blocking, shaping, and finishing techniques.',
  makeup:
    'Developed stage makeup designs for aging, gore, and fantasy characters through the use of face charts and practical application techniques. These projects emphasized color theory, prosthetic illusion, character storytelling, and makeup design tailored for stage performance.',
  'natural-dye':
    'Explored natural dye practices using traditional processes and plant- and mineral-based materials. These studies showcase dye results created with hibiscus, butterfly pea flower, crushed cochineal, and an indigo vat, highlighting the variation and possibilities of natural color development.',
  'specialty-dressing':
    'Specialty dressing samples featuring techniques from Xiqu (Chinese opera) and Kabuki theatre, exploring traditional methods of garment preparation, layering, and dressing practices unique to each performance tradition.',
};

const applyProjectDescription = (project) => {
  if (projectDescriptions[project.slug] !== undefined) {
    project.description = projectDescriptions[project.slug];
  } else if (project.category === 'Design') {
    project.description = '';
  }
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
  moveImageToFront(bySlug.get('moana'), '07.jpg');
  moveImageToFront(bySlug.get('448-psychosis'), '02.jpg');
  moveImageToFront(bySlug.get('mulan'), '15.jpg');
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
    description: '',
    images: corsets.flatMap((project) =>
      project.images.map((image, index) => ({
        src: image.src,
        alt: `${project.title} corsetry portfolio image ${index + 1}`,
      })),
    ),
  };
  moveImageToFront(corsetry, '02.jpg');

  const curatedProjects = [
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

  curatedProjects.forEach(applyProjectDescription);
  return curatedProjects;
};

const convertImage = async (source, outDir, baseName, index) => {
  const resize = { width: index === 0 ? 1300 : 1100, height: index === 0 ? 1500 : 1300, fit: 'inside', withoutEnlargement: true };
  const imageName = `${baseName}.jpg`;
  const imageOut = join(outDir, imageName);

  try {
    await sharp(source).rotate().resize(resize).jpeg({ quality: 86, mozjpeg: true }).toFile(imageOut);
    return imageName;
  } catch (sharpError) {
    if (!isHeifLikeExtension(extname(source).toLowerCase())) throw sharpError;
  }

  if (isHeifLikeExtension(extname(source).toLowerCase())) {
    const thumbDir = join(tmpdir(), `caitlin-heic-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    await mkdir(thumbDir, { recursive: true });
    try {
      const safeBaseName = basename(source).replace(/[^a-z0-9_-]+/gi, '-');
      const qlSource = extname(source).toLowerCase() === '.heic' ? source : join(thumbDir, `${safeBaseName || 'image'}.HEIC`);
      if (qlSource !== source) await copyFile(source, qlSource);
      await run('qlmanage', ['-t', '-s', String(resize.width), '-o', thumbDir, qlSource], { timeout: 15000 });
      const thumbnail = join(thumbDir, `${basename(qlSource)}.png`);
      await sharp(thumbnail).resize(resize).jpeg({ quality: 86, mozjpeg: true }).toFile(imageOut);
      return imageName;
    } finally {
      await rm(thumbDir, { recursive: true, force: true });
    }
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
      return isImageFile(file) || videoExtensions.has(extension);
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
