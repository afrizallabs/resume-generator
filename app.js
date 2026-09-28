const baseSteps = [
  { label: "Pribadi", title: "Informasi pribadi", description: "Mulai dengan cara perekrut menghubungimu." },
  { collection: "professional", label: "Profesional", title: "Pengalaman profesional", description: "Tunjukkan dampak dan hal yang pernah kamu kerjakan." },
  { collection: "education", label: "Pendidikan", title: "Riwayat pendidikan", description: "Tambahkan pendidikan formal dan pencapaianmu." },
  { collection: "organization", label: "Organisasi", title: "Pengalaman organisasi", description: "Ceritakan kontribusimu di luar pekerjaan." }
];
const othersStep = { label: "Lainnya", title: "Informasi lainnya", description: "Lengkapi resume dengan keterampilan, sertifikasi, atau prestasi.", kind: "others" };
const reviewStep = { label: "Tinjau", title: "Tinjau resume-mu", description: "Pastikan semua informasi sudah siap sebelum diekspor.", kind: "review" };

const state = {
  personal: { name: "", phone: "", email: "", linkedin: "", portfolio: [{ alias: "", url: "" }], address: "", description: "" },
  professional: [],
  education: [],
  organization: [],
  others: [],
  otherLinks: [],
  customSections: [],
  sectionOrder: ["professional", "education", "organization"],
  sectionTitles: {
    personal: "Informasi Pribadi",
    professional: "Pengalaman Profesional",
    education: "Pendidikan",
    organization: "Organisasi",
    others: "Lainnya"
  },
  appearance: { fontFamily: "Arial", fontSize: "small", lineHeight: 14, accentColor: "#000000", alignment: "left" }
};

let activeStep = 0;
let errorMessage = "";
let toastTimer;
let previewObserver;

const editor = document.querySelector("#editor-content");
const stepList = document.querySelector("#step-list");
const paper = document.querySelector("#resume-paper");
const shell = document.querySelector("#paper-shell");
const stage = document.querySelector("#preview-stage");
const toast = document.querySelector("#toast");

function getSteps() {
  const orderedSteps = state.sectionOrder.map(key => {
    const customSection = state.customSections.find(section => section.id === key);
    if (customSection) {
      return {
        label: customSection.title || "Bagian baru",
        title: customSection.title || "Bagian baru",
        description: "Tambahkan informasi untuk bagian resume ini.",
        kind: "custom",
        sectionId: customSection.id
      };
    }
    return baseSteps.find(step => step.collection === key);
  }).filter(Boolean);
  return [
    baseSteps[0],
    ...orderedSteps,
    othersStep,
    reviewStep
  ];
}

function makeCustomSection(kind) {
  const labels = {
    certificate: "Sertifikat",
    skill: "Skill",
    personal: "Project"
  };
  const fields = kind === "certificate"
    ? { title: "", organization: "", year: "", description: "", url: "" }
    : kind === "skill"
      ? { title: "", level: "", description: "" }
      : { title: "", year: "", description: "", alias: "", url: "" };
  return { id: newId(), kind, title: labels[kind], entries: [{ id: newId(), ...fields }] };
}

function makeCustomEntry(kind) {
  const fields = kind === "certificate"
    ? { title: "", organization: "", year: "", description: "", url: "" }
    : kind === "skill"
      ? { title: "", level: "", description: "" }
      : { title: "", year: "", description: "", alias: "", url: "" };
  return { id: newId(), ...fields };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `entry-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function makeEntry(collection) {
  const base = { id: newId(), bullets: [""] };
  if (collection === "professional") return { ...base, company: "", location: "", position: "", startDate: "", endDate: "" };
  if (collection === "education") return { ...base, institution: "", location: "", degree: "", startDate: "", endDate: "", gpa: "" };
  if (collection === "organization") return { ...base, organization: "", location: "", position: "", startDate: "", endDate: "" };
  return { id: newId(), title: "", year: "", description: "" };
}

function field(label, path, value, options = {}) {
  const id = `field-${path.replaceAll(".", "-")}`;
  const required = options.required ? ' required aria-required="true"' : "";
  const type = options.type ?? "text";
  const placeholder = options.placeholder ? ` placeholder="${escapeHtml(options.placeholder)}"` : "";
  const full = options.full ? " full-width" : "";
  const labelText = `${escapeHtml(label)}${options.required ? ' <span class="required-mark" aria-label="wajib">*</span>' : ""}`;
  const control = options.multiline
    ? `<textarea id="${id}" data-path="${path}"${required}${placeholder}>${escapeHtml(value)}</textarea>`
    : `<input id="${id}" data-path="${path}" type="${type}" value="${escapeHtml(value)}"${required}${placeholder}${options.autocomplete ? ` autocomplete="${options.autocomplete}"` : ""}>`;
  let hint = "";
  if (options.hint) hint = `<span class="field-hint">${escapeHtml(options.hint)}</span>`;
  return `<div class="form-field${full}"><label for="${id}">${labelText}</label>${control}${hint}</div>`;
}

function sectionHeading(index) {
  const step = getSteps()[index];
  const mark = step.kind === "review" ? "✓" : String(index + 1).padStart(2, "0");
  return `<div class="section-title-row"><div><h2>${escapeHtml(step.title)}</h2><p>${escapeHtml(step.description)}</p></div><span class="section-mark">${mark}</span></div>`;
}

function actionBar(index) {
  const steps = getSteps();
  const previous = index === 0 ? "" : `<button class="button button-light" type="button" data-action="previous">← <span>Kembali</span></button>`;
  const next = index === steps.length - 1
    ? `<button class="button button-accent" type="button" data-action="print"><span>Ekspor resume</span> <span aria-hidden="true">↗</span></button>`
    : `<button class="button button-accent" type="button" data-action="next"><span>Simpan &amp; lanjutkan</span> <span aria-hidden="true">→</span></button>`;
  return `<div class="editor-actions">${previous}<span class="actions-spacer"></span>${next}</div>`;
}

function renderPersonal() {
  const data = state.personal;
  const portfolios = data.portfolio.map((item, index) => `
    <div class="repeat-card">
      <div class="repeat-card-heading"><h3 class="repeat-card-title">Tautan ${index + 1}</h3>
        ${data.portfolio.length > 1 ? `<button class="icon-button" type="button" data-action="remove-portfolio" data-index="${index}" aria-label="Hapus tautan ${index + 1}">×</button>` : ""}
      </div>
      <div class="form-grid">
        ${field("Alias", `personal.portfolio.${index}.alias`, item.alias, { placeholder: "Contoh: Portfolio desain" })}
        ${field("URL", `personal.portfolio.${index}.url`, item.url, { placeholder: "namamu.com atau https://namamu.com" })}
      </div>
    </div>`).join("");
  return `${sectionHeading(0)}
    <form id="personal-form" novalidate>
      <div class="form-grid">
        ${field("Nama bagian di resume", "sectionTitles.personal", state.sectionTitles.personal, { placeholder: "Informasi Pribadi", full: true })}
        ${field("Nama lengkap", "personal.name", data.name, { required: true, placeholder: "Contoh: Nadia Putri", autocomplete: "name", full: true })}
        ${field("Nomor handphone", "personal.phone", data.phone, { type: "tel", placeholder: "+62 812 3456 7890", autocomplete: "tel" })}
        ${field("Email", "personal.email", data.email, { required: true, type: "email", placeholder: "nama@email.com", autocomplete: "email" })}
        ${field("LinkedIn", "personal.linkedin", data.linkedin, { required: true, placeholder: "linkedin.com/in/namamu", full: true })}
        <div class="form-field full-width"><span class="field-label">Portfolio / website</span><div class="bullet-fields">${portfolios}</div><button class="small-link-button" type="button" data-action="add-portfolio">＋ Tambah tautan</button></div>
        ${field("Alamat", "personal.address", data.address, { placeholder: "Kota, Provinsi", full: true })}
        ${field("Deskripsi singkat", "personal.description", data.description, { multiline: true, placeholder: "Ceritakan profil dan keahlian utamamu dalam beberapa kalimat.", hint: "Direkomendasikan 100-150 karakter", full: true })}
      </div>
      ${errorMessage ? `<p class="inline-error" role="alert">${escapeHtml(errorMessage)}</p>` : ""}
      ${actionBar(0)}
    </form>`;
}

function bulletFields(collection, index, entry) {
  const bullets = entry.bullets ?? [];
  const fields = bullets.map((bullet, bulletIndex) => `
    <div class="bullet-field-row">
      ${field("Deskripsi", `${collection}.${index}.bullets.${bulletIndex}`, bullet, { placeholder: "Hasil atau kontribusi yang terukur", full: true })}
      ${bullets.length > 1 ? `<button class="icon-button" type="button" data-action="remove-bullet" data-collection="${collection}" data-entry="${entry.id}" data-bullet="${bulletIndex}" aria-label="Hapus deskripsi ${bulletIndex + 1}">×</button>` : ""}
    </div>`).join("");
  return `<div class="form-field full-width"><span class="field-label">Pencapaian / Deskripsi</span><div class="bullet-fields">${fields}</div><button class="small-link-button" type="button" data-action="add-bullet" data-collection="${collection}" data-entry="${entry.id}">＋ Tambah Deskripsi</button></div>`;
}

function renderRepeatCard(collection, entry, index) {
  const heading = collection === "professional" ? "Pengalaman" : collection === "education" ? "Pendidikan" : "Organisasi";
  let content = "";
  if (collection === "professional") {
    content = `${field("Perusahaan", `professional.${index}.company`, entry.company, { placeholder: "Nama perusahaan" })}
      ${field("Lokasi", `professional.${index}.location`, entry.location, { placeholder: "Jakarta, Indonesia" })}
      ${field("Posisi", `professional.${index}.position`, entry.position, { placeholder: "Jabatan" })}
      ${field("Tanggal mulai", `professional.${index}.startDate`, entry.startDate, { type: "month" })}
      ${field("Tanggal selesai", `professional.${index}.endDate`, entry.endDate, { type: "month", hint: "Kosongkan jika masih bekerja" })}
      ${bulletFields(collection, index, entry)}`;
  } else if (collection === "education") {
    content = `${field("Institusi", `education.${index}.institution`, entry.institution, { placeholder: "Nama universitas / sekolah" })}
      ${field("Lokasi", `education.${index}.location`, entry.location, { placeholder: "Kota, Indonesia" })}
      ${field("Gelar / program studi", `education.${index}.degree`, entry.degree, { placeholder: "S1 Ilmu Komunikasi", full: true })}
      ${field("Tanggal mulai", `education.${index}.startDate`, entry.startDate, { type: "month" })}
      ${field("Tanggal selesai", `education.${index}.endDate`, entry.endDate, { type: "month" })}
      ${field("IPK / nilai", `education.${index}.gpa`, entry.gpa, { placeholder: "3.85 / 4.00" })}
      ${bulletFields(collection, index, entry)}`;
  } else {
    content = `${field("Nama organisasi", `organization.${index}.organization`, entry.organization, { placeholder: "Nama organisasi" })}
      ${field("Lokasi", `organization.${index}.location`, entry.location, { placeholder: "Kota, Indonesia" })}
      ${field("Posisi / jabatan", `organization.${index}.position`, entry.position, { placeholder: "Jabatan" })}
      ${field("Tanggal mulai", `organization.${index}.startDate`, entry.startDate, { type: "month" })}
      ${field("Tanggal selesai", `organization.${index}.endDate`, entry.endDate, { type: "month" })}
      ${bulletFields(collection, index, entry)}`;
  }
  return `<article class="repeat-card" data-entry-id="${entry.id}">
    <div class="repeat-card-heading"><h3 class="repeat-card-title">${heading} ${index + 1}</h3>
      <button class="icon-button" type="button" data-action="remove-entry" data-collection="${collection}" data-entry="${entry.id}" aria-label="Hapus ${heading.toLowerCase()} ${index + 1}">×</button>
    </div><div class="form-grid">${content}</div>
  </article>`;
}

function renderRepeatableStep(collection, stepIndex) {
  const list = state[collection];
  const isOther = collection === "others";
  const heading = isOther ? "Informasi lainnya" : collection === "professional" ? "Pengalaman profesional" : collection === "education" ? "Riwayat pendidikan" : "Pengalaman organisasi";
  const description = isOther ? "Sertifikasi, keterampilan, prestasi, dan hal lain yang relevan." : "Kamu bisa menambahkan beberapa entri dan mengatur pencapaian untuk setiap bagian.";
  const emptyText = isOther ? "Belum ada informasi tambahan." : `Belum ada ${collection === "professional" ? "pengalaman kerja" : collection === "education" ? "riwayat pendidikan" : "pengalaman organisasi"}.`;
  const cards = isOther ? list.map((item, index) => `
    <article class="repeat-card" data-entry-id="${item.id}">
      <div class="repeat-card-heading"><h3 class="repeat-card-title">Item ${index + 1}</h3>
        <button class="icon-button" type="button" data-action="remove-entry" data-collection="others" data-entry="${item.id}" aria-label="Hapus item ${index + 1}">×</button>
      </div>
      <div class="form-grid">
        ${field("Judul", `others.${index}.title`, item.title, { placeholder: "Contoh: Sertifikasi Google Analytics" })}
        ${field("Tahun", `others.${index}.year`, item.year, { placeholder: "2025" })}
        ${field("Deskripsi", `others.${index}.description`, item.description, { multiline: true, placeholder: "Jelaskan secara singkat", full: true })}
      </div>
    </article>`).join("") : list.map((item, index) => renderRepeatCard(collection, item, index)).join("");
  const addText = isOther ? "Tambah informasi" : collection === "professional" ? "Tambah pengalaman" : collection === "education" ? "Tambah pendidikan" : "Tambah organisasi";
  const optionalSectionSelect = isOther ? `
    <label class="form-field custom-section-select">
      <span>Tambah section opsional</span>
      <select data-action="add-section-option" aria-label="Tambah section opsional">
        <option value="">Pilih section...</option>
        <option value="certificate">Sertifikat</option>
        <option value="skill">Skill</option>
        <option value="personal">Project</option>
      </select>
    </label>` : "";
  const otherLinks = isOther ? `
    <div class="custom-link-list">
      <h3 class="custom-links-heading">Tautan tambahan</h3>
      ${state.otherLinks.map((item, index) => `
        <div class="repeat-card">
          <div class="repeat-card-heading"><h4 class="repeat-card-title">Tautan ${index + 1}</h4>
            <button class="icon-button" type="button" data-action="remove-other-link" data-index="${index}" aria-label="Hapus tautan ${index + 1}">×</button>
          </div>
          <div class="form-grid">
            ${field("Alias", `otherLinks.${index}.alias`, item.alias, { placeholder: "Contoh: GitHub" })}
            ${field("Link", `otherLinks.${index}.url`, item.url, { placeholder: "github.com/namamu" })}
          </div>
        </div>`).join("")}
      <button class="small-link-button" type="button" data-action="add-other-link">＋ Tambah link</button>
    </div>
  ` : "";
  return `${sectionHeading(stepIndex)}
    ${optionalSectionSelect}
    <div class="form-grid${isOther ? " section-name-fields" : ""}">${field("Nama bagian di resume", `sectionTitles.${collection}`, state.sectionTitles[collection], { placeholder: heading, full: true })}</div>
    <section aria-label="${heading}">
      ${list.length ? `<div class="repeatable-list">${cards}</div>` : `<div class="empty-section"><div><p>${emptyText}</p><span>Mulai tambahkan detail untuk melengkapi resume-mu.</span></div></div>`}
      <button class="add-entry-button" type="button" data-action="add-entry" data-collection="${collection}">＋ ${addText}</button>
      ${otherLinks}
    </section>
    ${actionBar(stepIndex)}`;
}

function renderCustomSection(section, stepIndex) {
  const sectionIndex = state.customSections.findIndex(item => item.id === section.id);
  const cards = section.entries.map((item, index) => `
    <article class="repeat-card" data-entry-id="${item.id}">
      <div class="repeat-card-heading"><h3 class="repeat-card-title">Item ${index + 1}</h3>
        <button class="icon-button" type="button" data-action="remove-custom-entry" data-section="${section.id}" data-entry="${item.id}" aria-label="Hapus item ${index + 1}">×</button>
      </div>
      <div class="form-grid">
        ${field("Judul", `customSections.${sectionIndex}.entries.${index}.title`, item.title, { placeholder: "Judul informasi" })}
        ${section.kind === "certificate" ? `
          ${field("Penerbit", `customSections.${sectionIndex}.entries.${index}.organization`, item.organization, { placeholder: "Nama lembaga" })}
          ${field("Tahun", `customSections.${sectionIndex}.entries.${index}.year`, item.year, { placeholder: "2025" })}
          ${field("Deskripsi singkat", `customSections.${sectionIndex}.entries.${index}.description`, item.description, { placeholder: "Ringkasan singkat sertifikat", full: true })}
          ${field("Link sertifikat", `customSections.${sectionIndex}.entries.${index}.url`, item.url, { placeholder: "contoh.com/sertifikat", full: true })}` : ""}
        ${section.kind === "skill" ? `
          ${field("Tingkat keahlian", `customSections.${sectionIndex}.entries.${index}.level`, item.level, { placeholder: "Mahir, menengah, dasar" })}
          ${field("Keterangan", `customSections.${sectionIndex}.entries.${index}.description`, item.description, { placeholder: "Opsional" })}` : ""}
        ${section.kind === "personal" ? `
          ${field("Tahun", `customSections.${sectionIndex}.entries.${index}.year`, item.year, { placeholder: "2025" })}
          ${field("Deskripsi", `customSections.${sectionIndex}.entries.${index}.description`, item.description, { multiline: true, placeholder: "Jelaskan secara singkat", full: true })}
          ${field("Alias link", `customSections.${sectionIndex}.entries.${index}.alias`, item.alias, { placeholder: "Contoh: Proyek saya" })}
          ${field("Link", `customSections.${sectionIndex}.entries.${index}.url`, item.url, { placeholder: "namamu.com/proyek" })}` : ""}
      </div>
    </article>`).join("");
  return `${sectionHeading(stepIndex)}
    <div class="form-grid section-name-fields">${field("Nama bagian di resume", `customSections.${sectionIndex}.title`, section.title, { placeholder: "Contoh: Proyek Pilihan", full: true })}</div>
    <div class="repeat-card-heading custom-section-delete-row">
      <span class="field-label">${escapeHtml(section.title || "Bagian baru")}</span>
      <button class="small-link-button remove-custom-section" type="button" data-action="remove-custom-section" data-section="${section.id}">Hapus bagian</button>
    </div>
    ${section.entries.length ? `<div class="repeatable-list">${cards}</div>` : `<div class="empty-section"><div><p>Belum ada item.</p><span>Tambahkan informasi untuk ditampilkan pada resume.</span></div></div>`}
    <button class="add-entry-button" type="button" data-action="add-custom-entry" data-section="${section.id}">＋ Tambah ${section.kind === "certificate" ? "sertifikat" : section.kind === "skill" ? "skill" : "item"}</button>
    ${actionBar(stepIndex)}`;
}

function renderReview(reviewIndex) {
  const person = state.personal;
  const contact = [person.email, person.phone].filter(Boolean).join(" · ");
  const initial = person.name.trim().charAt(0).toUpperCase() || "R";
  const items = [
    [state.sectionTitles.personal, "Data kontak dan profil", 0],
    ...state.sectionOrder.map(key => {
      const customSection = state.customSections.find(section => section.id === key);
      if (customSection) {
        return [customSection.title || "Bagian baru", `${customSection.entries.length} entri`, getSteps().findIndex(step => step.sectionId === key)];
      }
      return [state.sectionTitles[key], `${state[key].length} entri`, getSteps().findIndex(item => item.collection === key)];
    }),
    [state.sectionTitles.others, `${state.others.length + state.otherLinks.length} entri`, getSteps().findIndex(step => step.kind === "others")]
  ];
  const cards = items.map(([title, detail, stepIndex]) => {
    const count = stepIndex === 0 ? (person.name && person.email ? "Siap" : "Belum lengkap") : detail;
    return `<article class="review-card">
      <div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(detail)}</p></div>
      <span class="review-count">${escapeHtml(count)}</span>
      <button class="small-link-button review-edit" type="button" data-action="go-step" data-step="${stepIndex}">Edit</button>
    </article>`;
  }).join("");
  return `${sectionHeading(reviewIndex)}
    <div class="review-personal"><span class="review-avatar">${escapeHtml(initial)}</span>
      <div><p class="review-name">${escapeHtml(person.name || "Nama belum diisi")}</p><p class="review-contact">${escapeHtml(contact || "Tambahkan email untuk melengkapi kontak")}</p></div>
    </div>
    <div class="review-grid">${cards}</div>
    <p class="review-note">Resume-mu diproses langsung di browser. Pilih <strong>Ekspor resume</strong> untuk membuka dialog cetak, lalu pilih “Simpan sebagai PDF”.</p>
    ${actionBar(reviewIndex)}`;
}

function renderStepper() {
  const steps = getSteps();
  stepList.innerHTML = steps.map((step, index) => {
    const active = index === activeStep;
    const complete = index < activeStep;
    const orderIndex = index - 1;
    const canReorder = index > 0 && index < steps.length - 2;
    const reorderControls = canReorder ? `<span class="step-reorder" aria-label="Atur urutan ${escapeHtml(step.label)}">
      <button class="step-reorder-button" type="button" data-action="move-section" data-direction="-1" data-order-index="${orderIndex}" aria-label="Pindahkan ${escapeHtml(step.label)} ke tahap sebelumnya"${orderIndex === 0 ? " disabled" : ""}>←</button>
      <button class="step-reorder-button" type="button" data-action="move-section" data-direction="1" data-order-index="${orderIndex}" aria-label="Pindahkan ${escapeHtml(step.label)} ke tahap berikutnya"${orderIndex === state.sectionOrder.length - 1 ? " disabled" : ""}>→</button>
    </span>` : "";
    return `<li class="step-item${active ? " is-active" : ""}${complete ? " is-complete" : ""}">
      <button class="step-button" type="button" data-action="go-step" data-step="${index}" aria-current="${active ? "step" : "false"}" aria-label="Tahap ${index + 1}: ${escapeHtml(step.label)}">
        <span class="step-top"><span class="step-number">${complete ? "✓" : index + 1}</span><span class="step-connector"></span></span>
        <span class="step-label">${escapeHtml(step.label)}</span>
      </button>
      ${reorderControls}
    </li>`;
  }).join("");
}

function renderEditor() {
  const steps = getSteps();
  renderStepper();
  const step = steps[activeStep];
  if (activeStep === 0) editor.innerHTML = renderPersonal();
  else if (step.kind === "others") editor.innerHTML = renderRepeatableStep("others", activeStep);
  else if (step.kind === "custom") {
    const section = state.customSections.find(item => item.id === step.sectionId);
    editor.innerHTML = renderCustomSection(section, activeStep);
  } else if (step.kind === "review") editor.innerHTML = renderReview(activeStep);
  else editor.innerHTML = renderRepeatableStep(step.collection, activeStep);
}

function getPath(path) {
  return path.split(".").reduce((value, key) => value?.[key], state);
}

function setPath(path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  const target = keys.reduce((current, key) => current[key], state);
  target[last] = value;
}

function safeHref(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withProtocol);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : "";
  } catch {
    return "";
  }
}

function displayDate(value) {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length !== 2) return value;
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" }).format(date);
}

function entryDate(item) {
  const start = displayDate(item.startDate);
  const end = item.endDate ? displayDate(item.endDate) : (start ? "Sekarang" : "");
  return [start, end].filter(Boolean).join(" – ");
}

function renderContact(person) {
  const contacts = [];
  if (person.phone) contacts.push(`<a href="tel:${escapeHtml(person.phone.replace(/[^\d+]/g, ""))}">${escapeHtml(person.phone)}</a>`);
  if (person.email) contacts.push(`<a href="mailto:${escapeHtml(person.email)}">${escapeHtml(person.email)}</a>`);
  for (const [label, value] of [["LinkedIn", person.linkedin], ["Portfolio", person.portfolio]]) {
    const values = Array.isArray(value) ? value : [value];
    values.forEach(item => {
      const link = typeof item === "string" ? item : item.url;
      const linkLabel = typeof item === "string" ? label : item.alias;
      if (!link || !linkLabel) return;
      const href = safeHref(link);
      contacts.push(href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(linkLabel)}</a>` : escapeHtml(linkLabel));
    });
  }
  return contacts.length ? `<div class="resume-contact">${contacts.join("<span aria-hidden=\"true\">·</span>")}</div>` : "";
}

function renderBullets(bullets) {
  const values = (bullets ?? []).map(value => String(value).trim()).filter(Boolean);
  return renderBulletMarkup(values.map(escapeHtml));
}

function renderBulletMarkup(items) {
  const values = items.filter(Boolean);
  return values.length ? `<ul class="resume-bullets">${values.map(value => `<li>${value}</li>`).join("")}</ul>` : "";
}

function renderResumeEntry(title, subtitle, date, bullets, trailing = "") {
  if (![title, subtitle, date, trailing, ...(bullets ?? [])].some(value => String(value ?? "").trim())) return "";
  return `<article class="resume-entry">
    <div class="resume-entry-header"><p class="resume-entry-title">${escapeHtml(title)}</p>${date ? `<span class="resume-entry-date">${escapeHtml(date)}</span>` : ""}</div>
    ${subtitle ? `<p class="resume-entry-subtitle">${escapeHtml(subtitle)}</p>` : ""}
    ${trailing ? `<p class="resume-other-description">${escapeHtml(trailing)}</p>` : ""}
    ${renderBullets(bullets)}
  </article>`;
}

function renderResumeSection(title, body) {
  return body ? `<section class="resume-section"><h2 class="resume-section-title">${escapeHtml(title)}</h2><div class="resume-section-content">${body}</div></section>` : "";
}

function renderCertificateEntry(item) {
  if (![item.title, item.organization, item.year, item.description, item.url].some(value => String(value ?? "").trim())) return "";
  const href = safeHref(item.url);
  const title = item.title
    ? href
      ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>`
      : escapeHtml(item.title)
    : "";
  const details = [item.organization, item.year, item.description].filter(Boolean).map(escapeHtml);
  return [title, ...details].filter(Boolean).join(" · ");
}

function renderCustomSectionContent(section) {
  if (section.kind === "skill") {
    const skills = section.entries
      .filter(item => item.title.trim())
      .map(item => [item.title, item.level, item.description].filter(Boolean).join(" · "));
    return renderBullets(skills);
  }
  if (section.kind === "certificate") {
    return renderBulletMarkup(section.entries.map(renderCertificateEntry));
  }
  return renderBulletMarkup(section.entries.map(item => {
    const title = item.title.trim() ? escapeHtml(item.title.trim()) : "";
    const alias = item.alias.trim();
    const href = safeHref(item.url);
    const link = alias && item.url.trim()
      ? href
        ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(alias)}</a>`
        : escapeHtml(alias)
      : "";
    const details = [item.year, item.description].filter(Boolean).map(escapeHtml);
    return [title, ...details, link].filter(Boolean).join(" · ");
  }));
}

function resumeMarkup() {
  const personal = state.personal;
  const experiences = state.professional.map(item => renderResumeEntry(
    [item.company, item.location].filter(Boolean).join(" · "), item.position, entryDate(item), item.bullets
  )).join("");
  const education = state.education.map(item => renderResumeEntry(
    [item.institution, item.location].filter(Boolean).join(" · "),
    [item.degree, item.gpa ? `IPK ${item.gpa}` : ""].filter(Boolean).join(" · "),
    entryDate(item), item.bullets
  )).join("");
  const organizations = state.organization.map(item => renderResumeEntry(
    [item.organization, item.location].filter(Boolean).join(" · "), item.position, entryDate(item), item.bullets
  )).join("");
  const others = renderBulletMarkup(state.others.map(item =>
    [item.title, item.year, item.description].filter(Boolean).map(escapeHtml).join(" · ")
  ));
  const customSections = state.customSections.map(section => ({
    id: section.id,
    title: section.title,
    content: renderCustomSectionContent(section)
  }));
  const builtInSections = {
    professional: { title: state.sectionTitles.professional, content: experiences },
    education: { title: state.sectionTitles.education, content: education },
    organization: { title: state.sectionTitles.organization, content: organizations }
  };
  const orderedSections = state.sectionOrder.map(key => {
    const section = customSections.find(item => item.id === key) ?? builtInSections[key];
    return section ? renderResumeSection(section.title, section.content) : "";
  }).join("");
  const otherLinks = renderBulletMarkup(state.otherLinks.map(item => {
    const alias = item.alias.trim();
    const href = safeHref(item.url);
    if (!alias || !item.url.trim()) return "";
    return href
      ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(alias)}</a>`
      : escapeHtml(alias);
  }));
  const otherItems = [others, otherLinks].filter(Boolean).join("");
  const hasContent = [
    personal.name, personal.phone, personal.email, personal.linkedin,
    ...personal.portfolio.flatMap(item => [item.alias, item.url]), personal.address, personal.description,
    ...state.professional.flatMap(item => [item.company, item.location, item.position, item.startDate, item.endDate, ...item.bullets]),
    ...state.education.flatMap(item => [item.institution, item.location, item.degree, item.startDate, item.endDate, item.gpa, ...item.bullets]),
    ...state.organization.flatMap(item => [item.organization, item.location, item.position, item.startDate, item.endDate, ...item.bullets]),
    ...state.others.flatMap(item => [item.title, item.year, item.description]),
    ...state.otherLinks.flatMap(item => [item.alias, item.url]),
    ...customSections.flatMap(section => [section.title, ...section.content])
  ].some(value => String(value ?? "").trim());

  if (!hasContent) {
    paper.classList.add("is-empty");
    paper.innerHTML = `<div class="resume-empty-state"><span class="resume-empty-icon" aria-hidden="true">▤</span><strong>Resume-mu dimulai di sini</strong><p>Isi informasi pribadi untuk melihat pratinjau dokumen profesionalmu.</p></div>`;
    return;
  }
  paper.classList.remove("is-empty");
  const header = `<section class="resume-section resume-personal-section">
    ${state.sectionTitles.personal.trim() ? `<h2 class="resume-section-title">${escapeHtml(state.sectionTitles.personal)}</h2>` : ""}
    <header class="resume-header">
    ${personal.name ? `<h1 class="resume-name">${escapeHtml(personal.name)}</h1>` : ""}
    ${renderContact(personal)}
    ${personal.description.trim() ? `<p class="resume-description">${escapeHtml(personal.description)}</p>` : ""}
    ${personal.address.trim() ? `<p class="resume-address">${escapeHtml(personal.address)}</p>` : ""}
    </header>
  </section>`;
  paper.innerHTML = `<div class="resume-document">${header}
    ${orderedSections}
    ${renderResumeSection(state.sectionTitles.others, otherItems)}
  </div>`;
  const documentRoot = paper.querySelector(".resume-document");
  const appearance = state.appearance;
  const sizes = { small: 13, medium: 15, large: 17 };
  documentRoot.style.setProperty("--resume-font", appearance.fontFamily);
  documentRoot.style.setProperty("--resume-accent", appearance.accentColor);
  documentRoot.style.setProperty("--resume-rule", `${appearance.accentColor}55`);
  documentRoot.style.fontFamily = `${appearance.fontFamily}, sans-serif`;
  documentRoot.style.fontSize = `${sizes[appearance.fontSize] ?? sizes.small}px`;
  documentRoot.style.lineHeight = `${appearance.lineHeight}px`;
  documentRoot.style.textAlign = appearance.alignment;
  paper.querySelectorAll(".resume-entry-header").forEach(headerRow => {
    headerRow.style.textAlign = "left";
  });
}

function updatePreview() {
  resumeMarkup();
  fitPreview();
  const name = state.personal.name.trim();
  document.title = name ? `${name} — Resume Builder` : "Resume Builder";
}

function fitPreview() {
  if (!stage || !paper || !shell) return;
  const available = Math.max(240, stage.clientWidth - 20);
  const scale = Math.min(1, available / 793.7);
  paper.style.transform = `scale(${scale})`;
  shell.style.width = `${793.7 * scale}px`;
  shell.style.height = `${paper.scrollHeight * scale}px`;
}

function syncAppearanceControls() {
  document.querySelectorAll("[data-appearance]").forEach(control => {
    control.value = state.appearance[control.dataset.appearance];
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function validatePersonal() {
  const form = document.querySelector("#personal-form");
  if (!form) return true;
  const valid = form.reportValidity();
  if (!valid) {
    errorMessage = "Lengkapi nama, email, dan tautan LinkedIn untuk melanjutkan.";
    return false;
  }
  errorMessage = "";
  return true;
}

function nextStep() {
  if (activeStep === 0 && !validatePersonal()) {
    renderEditor();
    document.querySelector("#personal-form")?.reportValidity();
    return;
  }
  activeStep = Math.min(getSteps().length - 1, activeStep + 1);
  errorMessage = "";
  renderEditor();
  editor.scrollIntoView({ behavior: "smooth", block: "start" });
}

function printResume() {
  if (paper.classList.contains("is-empty")) {
    showToast("Isi setidaknya satu bagian resume sebelum mengekspor.");
    return;
  }
  window.print();
}

function handleEditorInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
  const path = target.dataset.path;
  if (!path) return;
  setPath(path, target.value);
  updatePreview();
  if (path.startsWith("sectionTitles.") || path.startsWith("customSections.") && path.endsWith(".title")) {
    renderStepper();
  }
}

function handleEditorChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement) || target.dataset.action !== "add-section-option") return;
  const kind = target.value;
  if (!["certificate", "skill", "personal"].includes(kind)) return;
  const section = makeCustomSection(kind);
  state.customSections.push(section);
  state.sectionOrder.push(section.id);
  activeStep = getSteps().findIndex(step => step.sectionId === section.id);
  renderEditor();
}

function handleAppearanceInput(event) {
  const control = event.target;
  const key = control.dataset.appearance;
  if (!key) return;
  const numeric = key === "lineHeight";
  let value = numeric ? Number(control.value) : control.value;
  if (numeric) {
    value = Math.max(12, Math.min(24, Number.isFinite(value) ? value : 14));
    control.value = String(value);
  }
  state.appearance[key] = value;
  updatePreview();
}

function handleClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "print") { printResume(); return; }
  if (action === "next") { nextStep(); return; }
  if (action === "previous") {
    activeStep = Math.max(0, activeStep - 1);
    errorMessage = "";
    renderEditor();
    return;
  }
  if (action === "go-step") {
    activeStep = Number(button.dataset.step);
    errorMessage = "";
    renderEditor();
    return;
  }
  if (action === "move-section") {
    const direction = Number(button.dataset.direction);
    const orderIndex = Number(button.dataset.orderIndex);
    const targetIndex = orderIndex + direction;
    if (targetIndex < 0 || targetIndex >= state.sectionOrder.length) return;
    const active = getSteps()[activeStep];
    const activeKey = active.sectionId ?? active.collection ?? active.kind;
    [state.sectionOrder[orderIndex], state.sectionOrder[targetIndex]] = [state.sectionOrder[targetIndex], state.sectionOrder[orderIndex]];
    activeStep = getSteps().findIndex(step => (step.sectionId ?? step.collection ?? step.kind) === activeKey);
    renderEditor();
    updatePreview();
    return;
  }
  const collection = button.dataset.collection;
  if (action === "add-entry" && collection) {
    state[collection].push(makeEntry(collection));
    renderEditor();
    const cards = editor.querySelectorAll(".repeat-card");
    cards[cards.length - 1]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return;
  }
  if (action === "add-custom-section") {
    const section = makeCustomSection("personal");
    state.customSections.push(section);
    state.sectionOrder.push(section.id);
    activeStep = getSteps().findIndex(step => step.sectionId === section.id);
    renderEditor();
    return;
  }
  if (action === "remove-custom-section") {
    const sectionIndex = state.customSections.findIndex(section => section.id === button.dataset.section);
    if (sectionIndex >= 0) {
      state.sectionOrder = state.sectionOrder.filter(key => key !== button.dataset.section);
      state.customSections.splice(sectionIndex, 1);
      activeStep = Math.min(activeStep, getSteps().length - 1);
      renderEditor();
      updatePreview();
      showToast("Bagian dihapus.");
    }
    return;
  }
  if (action === "add-custom-entry") {
    const section = state.customSections.find(item => item.id === button.dataset.section);
    if (section) section.entries.push(makeCustomEntry(section.kind));
    renderEditor();
    return;
  }
  if (action === "remove-custom-entry") {
    const section = state.customSections.find(item => item.id === button.dataset.section);
    const entryIndex = section?.entries.findIndex(item => item.id === button.dataset.entry) ?? -1;
    if (section && entryIndex >= 0) section.entries.splice(entryIndex, 1);
    renderEditor();
    updatePreview();
    return;
  }
  if (action === "remove-entry" && collection) {
    const list = state[collection];
    const index = list.findIndex(item => item.id === button.dataset.entry);
    if (index >= 0) list.splice(index, 1);
    renderEditor();
    updatePreview();
    showToast("Entri dihapus.");
    return;
  }
  if (action === "add-bullet" && collection) {
    const entry = state[collection].find(item => item.id === button.dataset.entry);
    entry?.bullets.push("");
    renderEditor();
    return;
  }
  if (action === "remove-bullet" && collection) {
    const entry = state[collection].find(item => item.id === button.dataset.entry);
    const bulletIndex = Number(button.dataset.bullet);
    if (entry?.bullets.length > 1) entry.bullets.splice(bulletIndex, 1);
    renderEditor();
    updatePreview();
    return;
  }
  if (action === "add-portfolio") {
    state.personal.portfolio.push({ alias: "", url: "" });
    renderEditor();
    return;
  }
  if (action === "remove-portfolio") {
    const index = Number(button.dataset.index);
    if (state.personal.portfolio.length > 1) state.personal.portfolio.splice(index, 1);
    renderEditor();
    updatePreview();
    return;
  }
  if (action === "add-other-link") {
    state.otherLinks.push({ alias: "", url: "" });
    renderEditor();
    return;
  }
  if (action === "remove-other-link") {
    const index = Number(button.dataset.index);
    if (index >= 0 && index < state.otherLinks.length) state.otherLinks.splice(index, 1);
    renderEditor();
    updatePreview();
  }
}

editor.addEventListener("input", handleEditorInput);
editor.addEventListener("change", event => {
  handleEditorInput(event);
  handleEditorChange(event);
});
document.querySelector(".preview-toolbar").addEventListener("input", handleAppearanceInput);
document.querySelector(".preview-toolbar").addEventListener("change", handleAppearanceInput);
document.addEventListener("click", event => {
  handleClick(event);
});

if ("ResizeObserver" in globalThis) {
  previewObserver = new ResizeObserver(fitPreview);
  previewObserver.observe(stage);
  previewObserver.observe(paper);
} else {
  window.addEventListener("resize", fitPreview);
}

syncAppearanceControls();
renderEditor();
updatePreview();
