/* ==========================================================================
   HMGS 2025 FİZİKSEL KİTAP REHBERİ VE CANLI TAKİP SENKRONİZASYON ARAYÜZÜ
   ========================================================================== */

function renderBookGuideCard(topicTitle, subjectName) {
    if (typeof BOOK_GUIDE_DATA === 'undefined') return '';

    // Find topic in guide database
    const topicObj = BOOK_GUIDE_DATA.find(t => 
        t.title.toLowerCase().includes(topicTitle.toLowerCase()) || 
        topicTitle.toLowerCase().includes(t.title.toLowerCase())
    );

    if (!topicObj || !topicObj.bookReadingGuide) return '';

    const guide = topicObj.bookReadingGuide;

    // Check live sync in user entries (hmgs_2026_data.json)
    let isSolvedInBank = false;
    let solvedDate = '';
    
    if (window.appState && window.appState.data && Array.isArray(window.appState.data.entries)) {
        const matchingEntry = window.appState.data.entries.find(e => 
            e.topic && e.topic.toLowerCase().includes(topicTitle.toLowerCase())
        );
        if (matchingEntry) {
            isSolvedInBank = true;
            solvedDate = matchingEntry.date || matchingEntry.isoDate || 'Önceki Çalışma';
        }
    }

    const solvedBadgeHTML = isSolvedInBank 
        ? `<span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
             <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
             Müessir Soru Bankası'ndan Çözüldü (${solvedDate})
           </span>`
        : `<span class="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-full font-medium">
             Soru Bankası Çözümü Bekliyor
           </span>`;

    return `
    <div class="my-3 p-4 bg-slate-900/90 border border-indigo-500/30 rounded-2xl shadow-xl backdrop-blur-md">
        <div class="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <div class="flex items-center gap-2">
                <span class="text-base">📖</span>
                <h4 class="text-xs font-bold text-indigo-300 uppercase tracking-wider">Fiziksel Kitap Rehberi (2025)</h4>
            </div>
            ${solvedBadgeHTML}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <!-- 1. Teori Okuması -->
            <div class="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 flex flex-col justify-between">
                <div>
                    <div class="flex items-center gap-1.5 text-indigo-400 font-semibold mb-1">
                        <span>📚</span> <span>Yetki Konu Anlatımı (2025)</span>
                    </div>
                    <p class="text-slate-300 text-[11px] leading-relaxed">${guide.theoryBook.topicTitle}</p>
                </div>
                <div class="mt-2 text-right">
                    <span class="bg-indigo-900/80 text-indigo-200 border border-indigo-700/50 text-[10px] px-2 py-0.5 rounded-md font-mono font-bold">
                        Sayfa: ${guide.theoryBook.pages}
                    </span>
                </div>
            </div>

            <!-- 2. Okuma Odak Noktası -->
            <div class="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 flex flex-col justify-between">
                <div>
                    <div class="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
                        <span>🎯</span> <span>Okuma Odak Noktası</span>
                    </div>
                    <p class="text-slate-300 text-[11px] leading-relaxed">${guide.theoryBook.readingFocus}</p>
                </div>
            </div>

            <!-- 3. Müessir Soru Bankası -->
            <div class="p-3 ${isSolvedInBank ? 'bg-emerald-950/30 border-emerald-700/40' : 'bg-slate-800/60 border-slate-700/50'} rounded-xl border flex flex-col justify-between">
                <div>
                    <div class="flex items-center gap-1.5 ${isSolvedInBank ? 'text-emerald-400' : 'text-purple-400'} font-semibold mb-1">
                        <span>📝</span> <span>Müessir Soru Bankası (2025)</span>
                    </div>
                    <p class="text-slate-300 text-[11px] leading-relaxed">${guide.questionBank.topicTitle}</p>
                </div>
                <div class="mt-2 text-right">
                    <span class="${isSolvedInBank ? 'bg-emerald-900/80 text-emerald-200 border-emerald-700/50' : 'bg-purple-900/80 text-purple-200 border-purple-700/50'} border text-[10px] px-2 py-0.5 rounded-md font-mono font-bold">
                        Sayfa: ${guide.questionBank.pages}
                    </span>
                </div>
            </div>
        </div>
    </div>
    `;
}

window.renderBookGuideCard = renderBookGuideCard;
