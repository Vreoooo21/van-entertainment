import { supabase } from './supabase.js';
import { escapeHtml, fallbackImage } from './utils.js';

const list = document.getElementById('survivalProjectList');
const { data, error } = await supabase
  .from('survival_projects')
  .select('*')
  .eq('is_visible', true)
  .order('display_order', { ascending: true });

if (error) {
  console.error(error);
  list.innerHTML = '<p class="error-state">Survival projects could not be loaded.</p>';
} else if (!data?.length) {
  list.innerHTML = '<p class="empty-state">Survival projects will appear here.</p>';
} else {
  list.innerHTML = data.map((item) => {
    const automaticUrl = `survival-detail.html?slug=${encodeURIComponent(item.slug)}`;
    const detailUrl = item.detail_url || automaticUrl;
    return `
      <a class="survival-card${item.is_featured ? ' featured-project' : ''}" href="${escapeHtml(detailUrl)}">
        <img src="${escapeHtml(item.poster_image || fallbackImage())}"
             alt="${escapeHtml(item.name)}"
             onerror="this.src='${fallbackImage()}'">
        <div class="survival-info">
          <span>${escapeHtml(item.generation_label || item.status)}</span>
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.year_label || item.status)} · View Project →</p>
        </div>
      </a>`;
  }).join('');
}
