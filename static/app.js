document.addEventListener("DOMContentLoaded", () => {
    let allRecords = [];
    let currentFilteredRecords = [];
    let statsData = {};
    let activeView = "grid";

    // Filter State
    const state = {
        search: "",
        category: "",
        minIdeas: null,
        maxIdeas: null,
        minFill: 0,
        maxFill: 100,
        selectedOrgs: new Set(),
        selectedThemes: new Set(),
        sortBy: "serial"
    };

    // DOM Elements - Sidebar & Controls
    const searchInput = document.getElementById("searchInput");
    const clearSearchBtn = document.getElementById("clearSearchBtn");
    const minIdeasInput = document.getElementById("minIdeasInput");
    const maxIdeasInput = document.getElementById("maxIdeasInput");
    const minFillRange = document.getElementById("minFillRange");
    const maxFillRange = document.getElementById("maxFillRange");
    const fillSliderVal = document.getElementById("fillSliderVal");
    const submissionsBadge = document.getElementById("submissionsBadge");
    const resetSidebarFiltersBtn = document.getElementById("resetSidebarFiltersBtn");
    const resetFiltersMainBtn = document.getElementById("resetFiltersMainBtn");

    const orgSearchInput = document.getElementById("orgSearchInput");
    const orgsCheckboxList = document.getElementById("orgsCheckboxList");
    const orgsSelectedCount = document.getElementById("orgsSelectedCount");

    const themeSearchInput = document.getElementById("themeSearchInput");
    const themesCheckboxList = document.getElementById("themesCheckboxList");
    const themesSelectedCount = document.getElementById("themesSelectedCount");

    const chipsWrapper = document.getElementById("chipsWrapper");
    const sortBy = document.getElementById("sortBy");
    const viewGridBtn = document.getElementById("viewGridBtn");
    const viewTableBtn = document.getElementById("viewTableBtn");
    const cardsContainer = document.getElementById("cardsContainer");
    const tableContainer = document.getElementById("tableContainer");
    const tableBody = document.getElementById("tableBody");
    const noResults = document.getElementById("noResults");
    const visibleCount = document.getElementById("visibleCount");
    const totalCount = document.getElementById("totalCount");
    const lastSyncTime = document.getElementById("lastSyncTime");
    const scrapeBtn = document.getElementById("scrapeBtn");
    const scrapeSpinner = document.getElementById("scrapeSpinner");
    const sidebarPanel = document.getElementById("sidebarPanel");
    const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");

    // KPI Elements
    const kpiTotal = document.getElementById("kpiTotal");
    const kpiSoftware = document.getElementById("kpiSoftware");
    const kpiHardware = document.getElementById("kpiHardware");
    const kpiIdeas = document.getElementById("kpiIdeas");
    const kpiFillRatio = document.getElementById("kpiFillRatio");

    // Modal elements
    const detailModal = document.getElementById("detailModal");
    const modalCloseBtn = document.getElementById("modalCloseBtn");
    const modalCloseFooterBtn = document.getElementById("modalCloseFooterBtn");

    // Initialize App
    fetchStatsAndData();

    // Event Listeners - Search & Inputs
    searchInput.addEventListener("input", (e) => {
        state.search = e.target.value.trim();
        clearSearchBtn.style.display = state.search ? "block" : "none";
        applyFilters();
    });

    clearSearchBtn.addEventListener("click", () => {
        searchInput.value = "";
        state.search = "";
        clearSearchBtn.style.display = "none";
        applyFilters();
    });

    // Submissions Presets
    document.querySelectorAll(".preset-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            document.querySelectorAll(".preset-chip").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");

            const min = chip.dataset.min;
            const max = chip.dataset.max;

            minIdeasInput.value = min !== undefined && min !== "" ? min : "";
            maxIdeasInput.value = max !== undefined && max !== "" ? max : "";

            state.minIdeas = min !== "" ? parseInt(min) : null;
            state.maxIdeas = max !== "" ? parseInt(max) : null;

            updateSubmissionsBadge();
            applyFilters();
        });
    });

    // Min & Max Idea Count Number Inputs
    minIdeasInput.addEventListener("input", () => {
        const val = minIdeasInput.value;
        state.minIdeas = val !== "" ? parseInt(val) : null;
        clearPresetChipHighlight();
        updateSubmissionsBadge();
        applyFilters();
    });

    maxIdeasInput.addEventListener("input", () => {
        const val = maxIdeasInput.value;
        state.maxIdeas = val !== "" ? parseInt(val) : null;
        clearPresetChipHighlight();
        updateSubmissionsBadge();
        applyFilters();
    });

    // Fill Percentage Dual Sliders
    minFillRange.addEventListener("input", () => {
        let minV = parseInt(minFillRange.value);
        let maxV = parseInt(maxFillRange.value);
        if (minV > maxV) {
            minV = maxV;
            minFillRange.value = minV;
        }
        state.minFill = minV;
        updateFillSliderVal();
        applyFilters();
    });

    maxFillRange.addEventListener("input", () => {
        let minV = parseInt(minFillRange.value);
        let maxV = parseInt(maxFillRange.value);
        if (maxV < minV) {
            maxV = minV;
            maxFillRange.value = maxV;
        }
        state.maxFill = maxV;
        updateFillSliderVal();
        applyFilters();
    });

    // Category Pills
    document.querySelectorAll(".cat-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            document.querySelectorAll(".cat-pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            state.category = pill.dataset.category || "";
            applyFilters();
        });
    });

    // Sub-search for Orgs & Themes
    orgSearchInput.addEventListener("input", (e) => {
        filterCheckboxList(orgsCheckboxList, e.target.value.toLowerCase());
    });

    themeSearchInput.addEventListener("input", (e) => {
        filterCheckboxList(themesCheckboxList, e.target.value.toLowerCase());
    });

    // Reset Buttons
    resetSidebarFiltersBtn.addEventListener("click", resetAllFilters);
    if (resetFiltersMainBtn) resetFiltersMainBtn.addEventListener("click", resetAllFilters);

    sortBy.addEventListener("change", (e) => {
        state.sortBy = e.target.value;
        applyFilters();
    });

    viewGridBtn.addEventListener("click", () => setView("grid"));
    viewTableBtn.addEventListener("click", () => setView("table"));

    scrapeBtn.addEventListener("click", triggerScrape);
    sidebarToggleBtn.addEventListener("click", () => {
        sidebarPanel.classList.toggle("open");
    });

    modalCloseBtn.addEventListener("click", closeModal);
    modalCloseFooterBtn.addEventListener("click", closeModal);
    detailModal.addEventListener("click", (e) => {
        if (e.target === detailModal) closeModal();
    });

    function setView(view) {
        activeView = view;
        if (view === "grid") {
            viewGridBtn.classList.add("active");
            viewTableBtn.classList.remove("active");
            cardsContainer.style.display = "grid";
            tableContainer.style.display = "none";
        } else {
            viewTableBtn.classList.add("active");
            viewGridBtn.classList.remove("active");
            cardsContainer.style.display = "none";
            tableContainer.style.display = "block";
        }
    }

    async function fetchStatsAndData() {
        try {
            const [recordsRes, statsRes] = await Promise.all([
                fetch("/api/records"),
                fetch("/api/stats")
            ]);

            const recordsData = await recordsRes.json();
            statsData = await statsRes.json();

            allRecords = recordsData.records || [];
            totalCount.textContent = recordsData.all_total || allRecords.length;

            if (recordsData.scraped_at) {
                const dateObj = new Date(recordsData.scraped_at);
                lastSyncTime.querySelector("span").textContent = `Synced: ${dateObj.toLocaleTimeString()}`;
            }

            renderKPIs(statsData);
            renderOrgsList(statsData.organizations || {});
            renderThemesList(statsData.themes || {});
            applyFilters();
        } catch (err) {
            showToast("Failed to fetch SIH data from server", "error");
            console.error(err);
        }
    }

    function renderKPIs(stats) {
        kpiTotal.textContent = stats.total_ps || 0;
        kpiSoftware.textContent = stats.categories?.Software || 0;
        kpiHardware.textContent = stats.categories?.Hardware || 0;
        kpiIdeas.textContent = (stats.total_ideas || 0).toLocaleString();
        kpiFillRatio.textContent = `${(stats.avg_fill_ratio * 100).toFixed(1)}%`;

        document.getElementById("catCountAll").textContent = stats.total_ps || 0;
        document.getElementById("catCountSoftware").textContent = stats.categories?.Software || 0;
        document.getElementById("catCountHardware").textContent = stats.categories?.Hardware || 0;
    }

    function renderOrgsList(orgsObj) {
        orgsCheckboxList.innerHTML = "";
        Object.entries(orgsObj).forEach(([orgName, count]) => {
            const label = document.createElement("label");
            label.className = "checkbox-item";
            label.dataset.name = orgName.toLowerCase();
            label.innerHTML = `
                <input type="checkbox" value="${escapeHtml(orgName)}">
                <span class="checkbox-item-title" title="${escapeHtml(orgName)}">${escapeHtml(orgName)}</span>
                <span class="checkbox-item-count">${count}</span>
            `;
            label.querySelector("input").addEventListener("change", (e) => {
                if (e.target.checked) {
                    state.selectedOrgs.add(orgName);
                } else {
                    state.selectedOrgs.delete(orgName);
                }
                updateOrgsSelectedCount();
                applyFilters();
            });
            orgsCheckboxList.appendChild(label);
        });
    }

    function renderThemesList(themesObj) {
        themesCheckboxList.innerHTML = "";
        Object.entries(themesObj).forEach(([themeName, count]) => {
            const label = document.createElement("label");
            label.className = "checkbox-item";
            label.dataset.name = themeName.toLowerCase();
            label.innerHTML = `
                <input type="checkbox" value="${escapeHtml(themeName)}">
                <span class="checkbox-item-title" title="${escapeHtml(themeName)}">${escapeHtml(themeName)}</span>
                <span class="checkbox-item-count">${count}</span>
            `;
            label.querySelector("input").addEventListener("change", (e) => {
                if (e.target.checked) {
                    state.selectedThemes.add(themeName);
                } else {
                    state.selectedThemes.delete(themeName);
                }
                updateThemesSelectedCount();
                applyFilters();
            });
            themesCheckboxList.appendChild(label);
        });
    }

    function filterCheckboxList(container, query) {
        container.querySelectorAll(".checkbox-item").forEach(item => {
            const name = item.dataset.name || "";
            if (!query || name.includes(query)) {
                item.style.display = "flex";
            } else {
                item.style.display = "none";
            }
        });
    }

    function updateSubmissionsBadge() {
        if (state.minIdeas === null && state.maxIdeas === null) {
            submissionsBadge.textContent = "All";
        } else if (state.minIdeas !== null && state.maxIdeas !== null) {
            submissionsBadge.textContent = `${state.minIdeas} - ${state.maxIdeas}`;
        } else if (state.minIdeas !== null) {
            submissionsBadge.textContent = `≥ ${state.minIdeas}`;
        } else if (state.maxIdeas !== null) {
            submissionsBadge.textContent = `≤ ${state.maxIdeas}`;
        }
    }

    function updateFillSliderVal() {
        fillSliderVal.textContent = `${state.minFill}% - ${state.maxFill}%`;
    }

    function clearPresetChipHighlight() {
        document.querySelectorAll(".preset-chip").forEach(c => c.classList.remove("active"));
    }

    function updateOrgsSelectedCount() {
        if (state.selectedOrgs.size > 0) {
            orgsSelectedCount.style.display = "inline-block";
            orgsSelectedCount.textContent = `${state.selectedOrgs.size} selected`;
        } else {
            orgsSelectedCount.style.display = "none";
        }
    }

    function updateThemesSelectedCount() {
        if (state.selectedThemes.size > 0) {
            themesSelectedCount.style.display = "inline-block";
            themesSelectedCount.textContent = `${state.selectedThemes.size} selected`;
        } else {
            themesSelectedCount.style.display = "none";
        }
    }

    function resetAllFilters() {
        state.search = "";
        state.category = "";
        state.minIdeas = null;
        state.maxIdeas = null;
        state.minFill = 0;
        state.maxFill = 100;
        state.selectedOrgs.clear();
        state.selectedThemes.clear();
        state.sortBy = "serial";

        searchInput.value = "";
        clearSearchBtn.style.display = "none";
        minIdeasInput.value = "";
        maxIdeasInput.value = "";
        minFillRange.value = 0;
        maxFillRange.value = 100;
        fillSliderVal.textContent = "0% - 100%";
        sortBy.value = "serial";

        document.querySelectorAll(".preset-chip").forEach(c => c.classList.remove("active"));
        document.querySelector('.preset-chip[data-min=""]').classList.add("active");

        document.querySelectorAll(".cat-pill").forEach(p => p.classList.remove("active"));
        document.querySelector('.cat-pill[data-category=""]').classList.add("active");

        orgsCheckboxList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        themesCheckboxList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

        updateOrgsSelectedCount();
        updateThemesSelectedCount();
        updateSubmissionsBadge();
        applyFilters();
    }

    function renderActiveChips() {
        chipsWrapper.innerHTML = "";
        const chips = [];

        if (state.search) {
            chips.push({ label: `Search: "${state.search}"`, clear: () => { searchInput.value = ""; state.search = ""; clearSearchBtn.style.display = "none"; } });
        }
        if (state.category) {
            chips.push({ label: `Category: ${state.category}`, clear: () => { state.category = ""; document.querySelectorAll(".cat-pill").forEach(p => p.classList.remove("active")); document.querySelector('.cat-pill[data-category=""]').classList.add("active"); } });
        }
        if (state.minIdeas !== null || state.maxIdeas !== null) {
            let label = "Submissions: ";
            if (state.minIdeas !== null && state.maxIdeas !== null) label += `${state.minIdeas} - ${state.maxIdeas}`;
            else if (state.minIdeas !== null) label += `≥ ${state.minIdeas}`;
            else if (state.maxIdeas !== null) label += `≤ ${state.maxIdeas}`;

            chips.push({
                label, clear: () => {
                    state.minIdeas = null; state.maxIdeas = null; minIdeasInput.value = ""; maxIdeasInput.value = "";
                    clearPresetChipHighlight(); document.querySelector('.preset-chip[data-min=""]').classList.add("active"); updateSubmissionsBadge();
                }
            });
        }
        if (state.minFill > 0 || state.maxFill < 100) {
            chips.push({ label: `Fill %: ${state.minFill}% - ${state.maxFill}%`, clear: () => { state.minFill = 0; state.maxFill = 100; minFillRange.value = 0; maxFillRange.value = 100; updateFillSliderVal(); } });
        }
        if (state.selectedOrgs.size > 0) {
            chips.push({ label: `Orgs (${state.selectedOrgs.size})`, clear: () => { state.selectedOrgs.clear(); orgsCheckboxList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false); updateOrgsSelectedCount(); } });
        }
        if (state.selectedThemes.size > 0) {
            chips.push({ label: `Themes (${state.selectedThemes.size})`, clear: () => { state.selectedThemes.clear(); themesCheckboxList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false); updateThemesSelectedCount(); } });
        }

        if (chips.length === 0) {
            chipsWrapper.innerHTML = '<span class="chip-none">None (Showing all)</span>';
            return;
        }

        chips.forEach(chip => {
            const span = document.createElement("span");
            span.className = "filter-chip";
            span.innerHTML = `${escapeHtml(chip.label)} <i class="fa-solid fa-xmark chip-remove"></i>`;
            span.querySelector(".chip-remove").addEventListener("click", () => {
                chip.clear();
                applyFilters();
            });
            chipsWrapper.appendChild(span);
        });
    }

    function applyFilters() {
        renderActiveChips();

        currentFilteredRecords = allRecords.filter(r => {
            if (state.category && r.category !== state.category) return false;

            const ideaCnt = r.idea_count !== null && r.idea_count !== undefined ? r.idea_count : 0;
            if (state.minIdeas !== null && ideaCnt < state.minIdeas) return false;
            if (state.maxIdeas !== null && ideaCnt > state.maxIdeas) return false;

            const fillPct = r.fill_ratio !== null && r.fill_ratio !== undefined ? Math.round(r.fill_ratio * 100) : 0;
            if (fillPct < state.minFill || fillPct > state.maxFill) return false;

            if (state.selectedOrgs.size > 0 && !state.selectedOrgs.has(r.organization)) return false;
            if (state.selectedThemes.size > 0 && !state.selectedThemes.has(r.theme)) return false;

            if (state.search) {
                const searchText = `${r.title} ${r.ps_number} ${r.organization} ${r.description_text} ${r.theme} ${r.department}`.toLowerCase();
                if (!searchText.includes(state.search)) return false;
            }

            return true;
        });

        // Sorting
        currentFilteredRecords.sort((a, b) => {
            if (state.sortBy === "title") return a.title.localeCompare(b.title);
            if (state.sortBy === "organization") return a.organization.localeCompare(b.organization);
            if (state.sortBy === "idea_count_desc") return (b.idea_count || 0) - (a.idea_count || 0);
            if (state.sortBy === "idea_count_asc") return (a.idea_count || 0) - (b.idea_count || 0);
            if (state.sortBy === "fill_ratio_desc") return (b.fill_ratio || 0) - (a.fill_ratio || 0);
            return (a.serial || 0) - (b.serial || 0);
        });

        visibleCount.textContent = currentFilteredRecords.length;

        if (currentFilteredRecords.length === 0) {
            cardsContainer.style.display = "none";
            tableContainer.style.display = "none";
            noResults.style.display = "block";
        } else {
            noResults.style.display = "none";
            if (activeView === "grid") {
                cardsContainer.style.display = "grid";
                tableContainer.style.display = "none";
            } else {
                cardsContainer.style.display = "none";
                tableContainer.style.display = "block";
            }
            renderGrid(currentFilteredRecords);
            renderTable(currentFilteredRecords);
        }
    }

    function renderGrid(records) {
        cardsContainer.innerHTML = "";
        records.forEach(r => {
            const card = document.createElement("div");
            card.className = "ps-card";

            const fillPct = r.fill_ratio !== null ? Math.round(r.fill_ratio * 100) : 0;
            const categoryClass = r.category === "Software" ? "category-software" : "category-hardware";

            card.innerHTML = `
                <div>
                    <div class="ps-card-header">
                        <span class="ps-number">${escapeHtml(r.ps_number || 'SIH2026')}</span>
                        <span class="category-tag ${categoryClass}">${escapeHtml(r.category)}</span>
                    </div>
                    <h3 class="ps-title" title="${escapeHtml(r.title)}">${escapeHtml(r.title)}</h3>
                    <div class="ps-org">
                        <i class="fa-solid fa-building"></i>
                        <span>${escapeHtml(r.organization)}</span>
                    </div>
                    ${r.theme ? `<div class="ps-theme-badge">${escapeHtml(r.theme)}</div>` : ''}
                </div>

                <div class="ps-progress-section">
                    <div class="progress-header">
                        <span>Submissions (${r.idea_count ?? 0} / ${r.idea_cap ?? 500})</span>
                        <strong>${fillPct}%</strong>
                    </div>
                    <div class="progress-bar-track">
                        <div class="progress-bar-fill" style="width: ${Math.min(fillPct, 100)}%;"></div>
                    </div>
                    <div class="ps-card-footer">
                        <span class="ps-deadline"><i class="fa-regular fa-calendar"></i> ${escapeHtml(r.deadline || 'N/A')}</span>
                        <button class="btn btn-secondary btn-sm modal-open-btn">
                            <span>Details</span>
                            <i class="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            `;

            card.querySelector(".modal-open-btn").addEventListener("click", () => openModal(r));
            cardsContainer.appendChild(card);
        });
    }

    function renderTable(records) {
        tableBody.innerHTML = "";
        records.forEach(r => {
            const tr = document.createElement("tr");
            const fillPct = r.fill_ratio !== null ? Math.round(r.fill_ratio * 100) : 0;
            const categoryClass = r.category === "Software" ? "category-software" : "category-hardware";

            tr.innerHTML = `
                <td><span class="ps-number">${escapeHtml(r.ps_number || 'SIH2026')}</span></td>
                <td>
                    <strong style="color:#fff; display:block;">${escapeHtml(r.title)}</strong>
                    <span style="font-size:0.75rem; color:#A5B4FC;">${escapeHtml(r.theme || '')}</span>
                </td>
                <td><span class="category-tag ${categoryClass}">${escapeHtml(r.category)}</span></td>
                <td style="color:#9CA3AF;">${escapeHtml(r.organization)}</td>
                <td>${r.idea_count ?? 0} / ${r.idea_cap ?? 500} (${fillPct}%)</td>
                <td style="color:#6B7280; font-size:0.8rem;">${escapeHtml(r.deadline || 'N/A')}</td>
                <td>
                    <button class="btn btn-secondary btn-sm tbl-open-btn">View</button>
                </td>
            `;

            tr.querySelector(".tbl-open-btn").addEventListener("click", () => openModal(r));
            tableBody.appendChild(tr);
        });
    }

    function openModal(record) {
        document.getElementById("modalPsNumber").textContent = record.ps_number || "SIH2026";
        const catBadge = document.getElementById("modalCategory");
        catBadge.textContent = record.category;
        catBadge.className = `category-tag ${record.category === "Software" ? "category-software" : "category-hardware"}`;
        
        document.getElementById("modalTheme").textContent = record.theme || "Uncategorized";
        document.getElementById("modalTitle").textContent = record.title;
        document.getElementById("modalOrganization").textContent = record.organization;

        const modalDeptWrapper = document.getElementById("modalDeptWrapper");
        if (record.department) {
            modalDeptWrapper.style.display = "block";
            document.getElementById("modalDepartment").textContent = record.department;
        } else {
            modalDeptWrapper.style.display = "none";
        }

        document.getElementById("modalDescriptionHtml").innerHTML = record.description_html || record.description_text || "No description provided.";
        
        const fillPct = record.fill_ratio !== null ? Math.round(record.fill_ratio * 100) : 0;
        document.getElementById("modalIdeas").textContent = `${record.idea_count ?? 0} / ${record.idea_cap ?? 500} (${fillPct}%)`;
        document.getElementById("modalProgressBar").style.width = `${Math.min(fillPct, 100)}%`;
        document.getElementById("modalDeadline").textContent = record.deadline || "N/A";

        const contactBox = document.getElementById("modalContactBox");
        if (record.contact) {
            contactBox.style.display = "block";
            document.getElementById("modalContact").textContent = record.contact;
        } else {
            contactBox.style.display = "none";
        }

        const linksSec = document.getElementById("modalLinksSection");
        linksSec.innerHTML = "";
        if (record.youtube_url) {
            const ytBtn = document.createElement("a");
            ytBtn.href = record.youtube_url;
            ytBtn.target = "_blank";
            ytBtn.className = "btn btn-secondary";
            ytBtn.innerHTML = `<i class="fa-brands fa-youtube" style="color:#EF4444;"></i> Watch Video`;
            linksSec.appendChild(ytBtn);
        }
        if (record.dataset_url) {
            const dsBtn = document.createElement("a");
            dsBtn.href = record.dataset_url;
            dsBtn.target = "_blank";
            dsBtn.className = "btn btn-secondary";
            dsBtn.innerHTML = `<i class="fa-solid fa-database" style="color:#06B6D4;"></i> Download Dataset`;
            linksSec.appendChild(dsBtn);
        }

        detailModal.classList.add("active");
        document.body.style.overflow = "hidden";
    }

    function closeModal() {
        detailModal.classList.remove("active");
        document.body.style.overflow = "";
    }

    async function triggerScrape() {
        scrapeSpinner.classList.add("fa-spin");
        scrapeBtn.disabled = true;
        showToast("Scraping live SIH problem statements...", "info");

        try {
            const res = await fetch("/api/scrape", { method: "POST" });
            const data = await res.json();

            if (data.success) {
                showToast(`Scraped successfully! ${data.ps_count} records updated.`, "success");
                await fetchStatsAndData();
            } else {
                showToast(`Scrape error: ${data.error}`, "error");
            }
        } catch (err) {
            showToast("Network error while scraping live data", "error");
        } finally {
            scrapeSpinner.classList.remove("fa-spin");
            scrapeBtn.disabled = false;
        }
    }

    function showToast(message, type = "info") {
        const toast = document.getElementById("toast");
        document.getElementById("toastMessage").textContent = message;
        toast.className = "toast show";
        setTimeout(() => { toast.className = "toast"; }, 4000);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
