import { supabase } from './supabase.js';
import { escapeHtml, formatDate } from './utils.js';
const programsBox = document.getElementById('auditionPrograms');
const programSelect = document.getElementById('auditionProgram');
const categorySelect = document.getElementById('auditionCategory');
const form = document.getElementById('auditionForm');
const result = document.getElementById('auditionResult');
const submitButton = document.getElementById('auditionSubmit');
const phoneInput = document.getElementById('auditionWhatsapp');
let programs = [];
let phoneWidget = null;
if (window.intlTelInput && phoneInput) {
    phoneWidget = window.intlTelInput(phoneInput, { initialCountry: 'id', separateDialCode: true, countrySearch: true, strictMode: true });
}
function categoriesFor(program) { return Array.isArray(program?.categories) ? program.categories : []; }
function updateCategories() {
    const program = programs.find((item) => String(item.id) === programSelect.value);
    categorySelect.innerHTML = '<option value="">Select category</option>' + categoriesFor(program).map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
}
const { data, error } = await supabase.from('audition_programs').select('*').eq('is_published', true).order('opens_at', { ascending: false });
if (error) {
    console.error(error); programsBox.innerHTML = '<p class="error-state">Audition programs could not be loaded.</p>'; programSelect.innerHTML = '<option value="">Unavailable</option>';
} else {
    programs = data || [];
    programsBox.innerHTML = programs.length ? programs.map((program) => `<article class="program-card"><div class="program-card-body"><span class="role-pill">${escapeHtml(program.status)}</span><h3>${escapeHtml(program.title)}</h3><p>${escapeHtml(program.summary || '')}</p><div class="program-meta">${program.opens_at ? `<span>Open: ${escapeHtml(formatDate(program.opens_at.slice(0,10)))}</span>` : ''}${program.closes_at ? `<span>Close: ${escapeHtml(formatDate(program.closes_at.slice(0,10)))}</span>` : ''}</div>${program.requirements ? `<p>${escapeHtml(program.requirements)}</p>` : ''}</div></article>`).join('') : '<p class="empty-state">No audition program has been published yet.</p>';
    const openPrograms = programs.filter((program) => program.status === 'Open');
    programSelect.innerHTML = '<option value="">Select an open audition</option>' + openPrograms.map((program) => `<option value="${program.id}">${escapeHtml(program.title)}</option>`).join('');
    if (!openPrograms.length) { submitButton.disabled = true; result.textContent = 'Applications are currently closed. Published schedules remain visible above.'; }
    updateCategories();
}
programSelect.addEventListener('change', updateCategories);
form.addEventListener('submit', async (event) => {
    event.preventDefault(); result.className = 'form-result'; result.textContent = '';
    if (document.getElementById('auditionWebsite').value) return;
    const selectedCountry = phoneWidget?.getSelectedCountryData?.() || { dialCode: '62', iso2: 'id', name: 'Indonesia' };
    const rawDigits = phoneInput.value.replace(/\D/g, '').replace(/^0+/, '');
    if (rawDigits.length < 6) { result.classList.add('error'); result.textContent = 'Enter a valid active WhatsApp number.'; return; }
    const e164 = `+${selectedCountry.dialCode}${rawDigits}`;
    const payload = {
        program_id: programSelect.value, full_name: document.getElementById('auditionFullName').value,
        stage_name: document.getElementById('auditionStageName').value, birth_date: document.getElementById('auditionBirthDate').value,
        country: document.getElementById('auditionCountry').value || selectedCountry.name, country_iso2: selectedCountry.iso2,
        calling_code: `+${selectedCountry.dialCode}`, whatsapp_number: rawDigits, whatsapp_e164: e164,
        email: document.getElementById('auditionEmail').value, category: categorySelect.value,
        social_handle: document.getElementById('auditionSocial').value, portfolio_url: document.getElementById('auditionPortfolio').value,
        introduction: document.getElementById('auditionIntroduction').value, consent: document.getElementById('auditionConsent').checked
    };
    submitButton.disabled = true; submitButton.textContent = 'Submitting...';
    const { data: response, error: submitError } = await supabase.rpc('submit_audition_application', { payload });
    submitButton.disabled = false; submitButton.textContent = 'Submit Audition';
    if (submitError) { result.classList.add('error'); result.textContent = submitError.message; return; }
    const item = response?.[0];
    result.classList.add('success'); result.innerHTML = `Application submitted. Save your registration code: <strong>${escapeHtml(item?.registration_code || '')}</strong>`;
    form.reset(); phoneWidget?.setCountry?.('id'); updateCategories();
});
