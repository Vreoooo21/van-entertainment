import { supabase } from './supabase.js';
import { escapeHtml, fallbackImage, safeExternalUrl } from './utils.js';

const loading = document.getElementById('survivalDetailLoading');
const content = document.getElementById('survivalDetailContent');
const errorSection = document.getElementById('survivalDetailError');

function showError(message = 'The survival project could not be found.') {
  loading.hidden = true;
  content.hidden = true;
  errorSection.hidden = false;
  document.getElementById('survivalDetailErrorText').textContent = message;
}

function dynamicUrl(slug) {
  return `survival-detail.html?slug=${encodeURIComponent(slug)}`;
}

function renderRelated(projects) {
  const section = document.getElementById('relatedSurvivalSection');
  const list = document.getElementById('relatedSurvivalList');
  if (!projects.length) {
    section.hidden = true;
    return;
  }
  list.innerHTML = projects.map((item) => `
    <a class="survival-related-card" href="${escapeHtml(item.detail_url || dynamicUrl(item.slug))}">
      <img src="${escapeHtml(item.poster_image || fallbackImage())}" alt="${escapeHtml(item.name)}" onerror="this.src='${fallbackImage()}'">
      <div><span>${escapeHtml(item.generation_label || item.status)}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.year_label || item.status)}</p></div>
    </a>`).join('');
  section.hidden = false;
}

async function loadProject() {
  const slug = new URLSearchParams(window.location.search).get('slug')?.trim().toLowerCase();
  if (!slug) {
    window.location.replace('survival.html');
    return;
  }

  const { data: project, error } = await supabase
    .from('survival_projects')
    .select('*')
    .eq('slug', slug)
    .eq('is_visible', true)
    .maybeSingle();

  if (error) {
    console.error(error);
    showError('Failed to load this survival project.');
    return;
  }
  if (!project) {
    showError();
    return;
  }

  const description = project.description || 'More information about this survival project will be announced soon.';
  const generation = project.generation_label || 'VAN SURVIVAL PROJECT';
  const period = project.year_label || 'Period not announced';
  const status = project.status || 'Planned';

  document.title = `${project.name} | VAN ENTERTAINMENT`;
  document.getElementById('survivalDetailPoster').src = project.poster_image || fallbackImage();
  document.getElementById('survivalDetailPoster').alt = `${project.name} poster`;
  document.getElementById('survivalDetailGeneration').textContent = generation;
  document.getElementById('survivalDetailName').textContent = project.name;
  document.getElementById('survivalDetailStatus').textContent = status;
  document.getElementById('survivalDetailPeriod').textContent = period;
  document.getElementById('survivalDetailDescription').textContent = description;

  document.getElementById('survivalMetaName').textContent = project.name;
  document.getElementById('survivalMetaGeneration').textContent = generation;
  document.getElementById('survivalMetaPeriod').textContent = period;
  document.getElementById('survivalMetaStatus').textContent = status;
  document.getElementById('survivalMetaFeatured').textContent = project.is_featured ? 'Yes' : 'No';
  document.getElementById('survivalLongDescription').textContent = description;

  const specialUrl = safeExternalUrl(project.detail_url);
  const specialLink = document.getElementById('survivalSpecialPage');
  if (project.detail_url && project.detail_url !== dynamicUrl(project.slug)) {
    specialLink.href = specialUrl || project.detail_url;
    specialLink.hidden = false;
  }

  const { data: related, error: relatedError } = await supabase
    .from('survival_projects')
    .select('name,slug,generation_label,year_label,status,poster_image,detail_url')
    .eq('is_visible', true)
    .neq('id', project.id)
    .order('display_order', { ascending: true })
    .limit(3);
  if (!relatedError) renderRelated(related || []);

  loading.hidden = true;
  errorSection.hidden = true;
  content.hidden = false;
}

await loadProject();
