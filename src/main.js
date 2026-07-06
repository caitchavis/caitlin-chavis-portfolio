import { projects } from './project-data.js?v=20260706-safari-images';

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
  const count = project.images.length;
  const label = count === 1 ? 'image' : 'images';
  return `${project.category} · ${count} ${label}`;
};

const renderProjects = () => {
  const visible = projects.filter((project) => currentFilter === 'All' || project.category === currentFilter);
  grid.innerHTML = visible
    .map((project, index) => {
      const cover = project.images[0];
      return `
        <article class="project-card" data-reveal style="--delay: ${Math.min(index * 55, 330)}ms">
          <button type="button" data-project="${project.slug}" aria-label="Open ${project.title}">
            <span class="project-media">
              <img src="${cover.src}" alt="${cover.alt}" />
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
  dialogDescription.textContent = project.description;
  dialogGallery.innerHTML = project.images
    .map((image) => `<img src="${image.src}" alt="${image.alt}" />`)
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
