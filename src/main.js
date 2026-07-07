import { projects } from './project-data.js?v=20260706-full-media';

const grid = document.querySelector('#projectGrid');
const filterButtons = [...document.querySelectorAll('.filter-button')];
const dialog = document.querySelector('#projectDialog');
const dialogTitle = document.querySelector('#dialogTitle');
const dialogCategory = document.querySelector('#dialogCategory');
const dialogDescription = document.querySelector('#dialogDescription');
const dialogGallery = document.querySelector('#dialogGallery');
const closeDialog = document.querySelector('.dialog-close');

let currentFilter = 'All';

const projectSummary = (project) => {
  const images = project.images.filter((item) => item.type !== 'video').length;
  const videos = project.images.filter((item) => item.type === 'video').length;
  const imageLabel = images === 1 ? 'image' : 'images';
  const videoLabel = videos === 1 ? 'video' : 'videos';
  const media = videos ? `${images} ${imageLabel} · ${videos} ${videoLabel}` : `${images} ${imageLabel}`;
  return `${project.category} · ${media}`;
};

const projectMatchesFilter = (project) =>
  currentFilter === 'All' || project.category === currentFilter || project.tags?.includes(currentFilter);

const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character]);

const renderDescription = (description = '') =>
  description
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('');

const renderMedia = (item) => {
  if (item.type === 'video') {
    return `
      <video controls preload="metadata" playsinline>
        <source src="${item.src}" />
        Your browser does not support this video.
      </video>
    `;
  }
  return `<img src="${item.src}" alt="${item.alt}" />`;
};

const renderProjects = () => {
  const visible = projects.filter(projectMatchesFilter);
  grid.innerHTML = visible
    .map((project, index) => {
      const cover = project.images.find((item) => item.type !== 'video') || project.images[0];
      return `
        <article class="project-card" data-reveal style="--delay: ${Math.min(index * 55, 330)}ms">
          <button type="button" data-project="${project.slug}" aria-label="Open ${project.title}">
            <span class="project-media">
              ${renderMedia(cover)}
            </span>
            <span class="project-meta">
              <span>${projectSummary(project)}</span>
              <strong>${project.title}</strong>
            </span>
          </button>
        </article>
      `;
    })
    .join('');
  observeReveal();
};

const openProject = (slug) => {
  const project = projects.find((item) => item.slug === slug);
  if (!project) return;
  dialogTitle.textContent = project.title;
  dialogCategory.textContent = projectSummary(project);
  dialogDescription.innerHTML = renderDescription(project.description);
  dialogGallery.innerHTML = project.images
    .map(renderMedia)
    .join('');
  dialog.showModal();
  document.body.classList.add('dialog-open');
};

const closeProject = () => {
  dialog.close();
  document.body.classList.remove('dialog-open');
};

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle('active', item === button));
    renderProjects();
  });
});

grid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-project]');
  if (button) openProject(button.dataset.project);
});

closeDialog.addEventListener('click', closeProject);
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) closeProject();
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && dialog.open) document.body.classList.remove('dialog-open');
});

let revealObserver;
function observeReveal() {
  revealObserver?.disconnect();
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14, rootMargin: '0px 0px -8% 0px' },
  );
  document.querySelectorAll('[data-reveal]:not(.is-visible)').forEach((item) => revealObserver.observe(item));
}

renderProjects();
