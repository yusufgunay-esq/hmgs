/* ==========================================================================
   HMGS · GÖRSELLEŞTİRME MOTORLARI v3.0 (MİNİMALİST / FLOW)
   Standart: GORSELLESTIRME_VE_KAPSAM_STANDARDI.md §B.2
   Veri-güdümlü, etkileşim zorunlu. window.HMGSV3 olarak dışa açılır.
   Kalıplar: decision_sim · calculator · scene_story · drag_classify ·
             time_slider · guess_table · step_reveal · interactive_hierarchy ·
             family_tree
   ========================================================================== */

window.HMGSV3 = (function () {
  const types = ['decision_sim', 'calculator', 'scene_story', 'drag_classify', 'time_slider',
    'guess_table', 'step_reveal', 'interactive_hierarchy', 'family_tree'];
  let cssInjected = false;

  function injectCss() {
    if (cssInjected) return;
    cssInjected = true;
    const css = `
.hv3{--hv3-ink:#18181B;--hv3-muted:#6B6B72;--hv3-faint:#A1A1A8;--hv3-line:rgba(24,24,27,.08);--hv3-line2:rgba(24,24,27,.13);
  --hv3-surface:#FFFFFF;--hv3-raise:#FAFAF8;--hv3-accent:#5B5BD6;--hv3-accent-ink:#4642B4;--hv3-accent-soft:rgba(91,91,214,.08);
  --hv3-green:#0F9D58;--hv3-green-soft:rgba(15,157,88,.10);--hv3-green-ink:#0b6b3d;
  --hv3-red:#E5484D;--hv3-red-soft:rgba(229,72,77,.09);--hv3-red-ink:#b02a2e;
  --hv3-amber:#D98A0B;--hv3-amber-soft:rgba(217,138,11,.10);--hv3-amber-ink:#8a5800;
  font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;color:var(--hv3-ink);animation:hv3fade .35s cubic-bezier(.22,.61,.36,1)}
@keyframes hv3fade{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
.hv3 .hv3-h{font-size:15px;color:var(--hv3-muted);margin-bottom:16px}
.hv3 .hv3-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 2px;border-bottom:1px solid var(--hv3-line)}
.hv3 .hv3-lbl{font-size:15px;font-weight:500}
.hv3 .hv3-lbl small{display:block;color:var(--hv3-faint);font-size:12px;font-weight:500;margin-top:1px}
.hv3 .hv3-seg{display:inline-flex;background:var(--hv3-raise);border:1px solid var(--hv3-line);border-radius:999px;padding:3px}
.hv3 .hv3-seg button{font:inherit;font-size:13px;font-weight:500;color:var(--hv3-muted);background:transparent;border:0;padding:6px 15px;border-radius:999px;cursor:pointer;transition:all .18s}
.hv3 .hv3-seg button.on{background:var(--hv3-surface);color:var(--hv3-ink);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.hv3 .hv3-res{border-radius:16px;padding:18px 20px;margin-top:22px;background:var(--hv3-raise);border:1px solid var(--hv3-line);transition:background .3s}
.hv3 .hv3-rt{font-size:18px;font-weight:600;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.hv3 .hv3-rd{font-size:14px;margin-top:7px;line-height:1.6;color:var(--hv3-muted)}
.hv3 .hv3-pill{font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:999px;background:var(--hv3-surface);color:var(--hv3-muted);border:1px solid var(--hv3-line)}
.hv3 .hv3-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1px;margin-top:14px;background:var(--hv3-line);border:1px solid var(--hv3-line);border-radius:12px;overflow:hidden}
.hv3 .hv3-mini{background:var(--hv3-surface);padding:13px 15px}
.hv3 .hv3-mt{font-size:11.5px;font-weight:600;color:var(--hv3-faint);text-transform:uppercase;letter-spacing:.03em}
.hv3 .hv3-mv{font-size:14px;font-weight:600;margin-top:5px;line-height:1.4}
.hv3 .hv3-trap{background:var(--hv3-amber-soft);border-radius:12px;padding:12px 15px;font-size:13.5px;color:var(--hv3-amber-ink);margin-top:16px;line-height:1.55}
.hv3 .hv3-law{background:var(--hv3-accent-soft);border-radius:12px;padding:13px 16px;font-size:14px;color:var(--hv3-accent-ink);line-height:1.6;margin-top:18px}
.hv3 input[type=number]{font:inherit;font-size:16px;font-weight:600;padding:8px 11px;border:1px solid var(--hv3-line2);border-radius:10px;background:var(--hv3-surface);color:var(--hv3-ink);width:170px}
.hv3 input[type=number]:focus{outline:0;border-color:var(--hv3-accent)}
.hv3 .hv3-calc{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:11px;margin-top:20px}
.hv3 .hv3-cell{background:var(--hv3-raise);border:1px solid var(--hv3-line);border-radius:12px;padding:15px 17px}
.hv3 .hv3-cn{font-size:11.5px;color:var(--hv3-faint);font-weight:600;text-transform:uppercase;letter-spacing:.03em}
.hv3 .hv3-cf{font-size:28px;font-weight:700;margin-top:5px;letter-spacing:-.02em;line-height:1}
.hv3 .hv3-cm{font-size:13px;color:var(--hv3-muted);font-weight:600;margin-top:5px}
.hv3 .hv3-dots{display:flex;gap:5px;margin-bottom:14px}
.hv3 .hv3-dots i{height:3px;flex:1;border-radius:3px;background:var(--hv3-line2);transition:background .3s}
.hv3 .hv3-stage{position:relative;height:280px;background:var(--hv3-raise);border:1px solid var(--hv3-line);border-radius:16px;overflow:hidden}
.hv3 .hv3-sc{position:absolute;inset:0;animation:hv3fade .35s}
.hv3 .hv3-actor{position:absolute;display:flex;flex-direction:column;align-items:center;width:80px;font-size:12.5px;font-weight:600;text-align:center}
.hv3 .hv3-ico{width:46px;height:46px;border-radius:50%;background:var(--hv3-surface);border:1px solid var(--hv3-line);display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:5px;box-shadow:0 1px 3px rgba(0,0,0,.05)}
.hv3 .hv3-actor small{color:var(--hv3-faint);font-size:11px;font-weight:500}
.hv3 .hv3-flow{position:absolute;font-size:13px;font-weight:600;color:var(--hv3-muted);white-space:nowrap;animation:hv3slide 1.5s ease-in-out infinite;display:inline-flex;align-items:center;padding:0 4px}
@keyframes hv3slide{0%,100%{transform:translateX(0);opacity:.7}50%{transform:translateX(6px);opacity:1}}
.hv3 .hv3-shake{animation:hv3shk .5s ease-in-out 3}
@keyframes hv3shk{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
.hv3 .hv3-tap{display:inline-block;animation:hv3tap 1s ease-in-out infinite;transform-origin:78% 82%}
@keyframes hv3tap{0%,100%{transform:rotate(-13deg)}50%{transform:rotate(7deg)}}
.hv3 .hv3-nav{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px}
.hv3 .hv3-nav button{font:inherit;font-size:14px;font-weight:500;color:var(--hv3-ink);padding:8px 16px;border-radius:999px;border:1px solid var(--hv3-line2);background:var(--hv3-surface);cursor:pointer}
.hv3 .hv3-nav button:disabled{opacity:.35;cursor:default}
.hv3 .hv3-cap{flex:1;text-align:center;font-size:13.5px;font-weight:600;color:var(--hv3-muted)}
/* Doldurma kalıbı (fill_slots) — göstermek değil, doldurtmak */
.hv3 .hv3-fs{border:1px solid var(--hv3-line);border-radius:14px;overflow:hidden;background:var(--hv3-surface);margin-top:4px}
.hv3 .hv3-fsr{display:grid;grid-template-columns:1.5fr repeat(calc(var(--fs-cols) - 1),1fr);gap:1px;background:var(--hv3-line)}
.hv3 .hv3-fsr>*{background:var(--hv3-surface);padding:11px 13px;font-size:13px;display:flex;align-items:center}
.hv3 .hv3-fsh>*{background:var(--hv3-raise);font-size:11.5px;font-weight:600;color:var(--hv3-faint);text-transform:uppercase;letter-spacing:.03em}
.hv3 .hv3-fsname{font-weight:600}
.hv3 .hv3-fscell{font:inherit;font-size:13px;width:100%;justify-content:center;border:1px dashed var(--hv3-line2);border-radius:9px;background:var(--hv3-raise);color:var(--hv3-faint);cursor:pointer;padding:8px 6px;margin:3px;transition:all .15s}
.hv3 .hv3-fscell:hover:not([disabled]){border-color:var(--hv3-accent);color:var(--hv3-accent-ink)}
.hv3 .hv3-fscell.active{border-style:solid;border-color:var(--hv3-accent);background:var(--hv3-accent-soft);color:var(--hv3-accent-ink)}
.hv3 .hv3-fscell.ok{border-style:solid;border-color:var(--hv3-green-ink);background:var(--hv3-green-soft);color:var(--hv3-green-ink);font-weight:600;cursor:default}
.hv3 .hv3-fscell.no{border-style:solid;border-color:var(--hv3-red-ink);background:var(--hv3-red-soft);color:var(--hv3-red-ink);font-weight:600;cursor:default}
.hv3 .hv3-fspool{margin-top:13px;background:var(--hv3-raise);border:1px solid var(--hv3-line);border-radius:14px;padding:13px 15px;animation:hv3fade .25s}
.hv3 .hv3-fspoolq{font-size:13.5px;font-weight:600;margin-bottom:10px}
.hv3 .hv3-fspoolc{display:flex;flex-wrap:wrap;gap:7px}
.hv3 .hv3-fschip{font:inherit;font-size:13.5px;font-weight:600;padding:8px 15px;border-radius:999px;border:1px solid var(--hv3-line2);background:var(--hv3-surface);color:var(--hv3-ink);cursor:pointer;transition:all .15s}
.hv3 .hv3-fschip:hover{border-color:var(--hv3-accent);background:var(--hv3-accent-soft);color:var(--hv3-accent-ink)}
/* Geri-çağırma kapısı — anlatım, tahmin edilmeden açılmaz (standart v4.1 §B.0.6) */
.hv3 .hv3-ask{margin-top:16px;animation:hv3fade .3s}
.hv3 .hv3-askq{font-size:14.5px;font-weight:600;line-height:1.55;margin-bottom:11px}
.hv3 .hv3-askopts{display:flex;flex-direction:column;gap:7px}
.hv3 .hv3-asko{font:inherit;font-size:13.5px;line-height:1.5;text-align:left;padding:11px 14px;border-radius:12px;border:1px solid var(--hv3-line2);background:var(--hv3-surface);color:var(--hv3-ink);cursor:pointer;transition:border-color .15s,background .15s}
.hv3 .hv3-asko:hover:not(:disabled){border-color:var(--hv3-accent);background:var(--hv3-raise)}
.hv3 .hv3-asko:disabled{cursor:default}
.hv3 .hv3-asko.ok{border-color:var(--hv3-green-ink);background:var(--hv3-green-soft);color:var(--hv3-green-ink);font-weight:600}
.hv3 .hv3-asko.no{border-color:var(--hv3-red-ink);background:var(--hv3-red-soft);color:var(--hv3-red-ink);font-weight:600}
.hv3 .hv3-asko.picked::after{content:' ← seçtiğin';font-size:11.5px;font-weight:500;opacity:.75}
.hv3 .hv3-askfb{margin-top:11px;font-size:13.5px;line-height:1.6;border-radius:12px;padding:11px 14px}
.hv3 .hv3-askfb.ok{background:var(--hv3-green-soft);color:var(--hv3-green-ink)}
.hv3 .hv3-askfb.no{background:var(--hv3-red-soft);color:var(--hv3-red-ink)}
/* Sahne anlatım bloğu — konu gövdesi buraya akar (standart v4 §B.0) */
.hv3 .hv3-tell{margin-top:16px;font-size:14.5px;line-height:1.72;color:var(--hv3-ink);animation:hv3fade .35s}
.hv3 .hv3-tell p{margin:0 0 10px}
.hv3 .hv3-tell p:last-child{margin-bottom:0}
.hv3 .hv3-tell b,.hv3 .hv3-tell strong{font-weight:600}
.hv3 .hv3-tell .hv3-key{background:var(--hv3-accent-soft);color:var(--hv3-accent-ink);border-radius:5px;padding:1px 5px;font-weight:600}
.hv3 .hv3-tell .hv3-warnk{background:var(--hv3-red-soft);color:var(--hv3-red-ink);border-radius:5px;padding:1px 5px;font-weight:600}
.hv3 .hv3-tell ul{margin:0 0 10px;padding-left:20px}
.hv3 .hv3-tell li{margin-bottom:5px}
.hv3 .hv3-tell blockquote{margin:12px 0 0;padding:11px 15px;border-left:3px solid var(--hv3-line2);background:var(--hv3-raise);border-radius:0 10px 10px 0;font-size:13.5px;color:var(--hv3-muted);line-height:1.65}
.hv3 .hv3-tell blockquote b{color:var(--hv3-ink)}
.hv3 .hv3-chips{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 18px}
.hv3 .hv3-chip{background:var(--hv3-surface);border:1px solid var(--hv3-line2);border-radius:999px;padding:8px 14px;font-size:13.5px;font-weight:450;cursor:grab;user-select:none;transition:all .15s}
.hv3 .hv3-chip.placed{opacity:.3;cursor:default;border-color:var(--hv3-line)}
.hv3 .hv3-bins{display:grid;grid-template-columns:repeat(3,1fr);gap:11px}
.hv3 .hv3-bin{background:var(--hv3-raise);border:1.5px dashed var(--hv3-line2);border-radius:16px;padding:15px;min-height:120px;transition:all .18s}
.hv3 .hv3-bin.over{border-color:var(--hv3-accent);border-style:solid;background:var(--hv3-accent-soft)}
.hv3 .hv3-bin h4{font-size:13px;font-weight:600;margin-bottom:9px;line-height:1.35}
.hv3 .hv3-bin h4 span{font-weight:450;color:var(--hv3-faint);font-size:11px}
.hv3 .hv3-drop{font-size:12px;padding:7px 10px;border-radius:9px;margin-bottom:6px;font-weight:500;line-height:1.4}
.hv3 .hv3-ok{background:var(--hv3-green-soft);color:var(--hv3-green-ink)}
.hv3 .hv3-no{background:var(--hv3-red-soft);color:var(--hv3-red-ink)}
.hv3 .hv3-score{font-size:13.5px;font-weight:600;margin-top:14px;color:var(--hv3-muted)}
.hv3 .hv3-hint{font-size:13px;color:var(--hv3-muted);margin:0 0 10px}

/* 6) GUESS_TABLE */
.hv3 .hv3-gt{border:1px solid var(--hv3-line);border-radius:14px;overflow:hidden;background:var(--hv3-surface)}
.hv3 .hv3-gtr{display:grid;gap:1px;background:var(--hv3-line)}
.hv3 .hv3-gtr>*{background:var(--hv3-surface);padding:11px 13px}
.hv3 .hv3-gth>*{font-size:11.5px;font-weight:700;color:var(--hv3-faint);text-transform:uppercase;letter-spacing:.03em;background:var(--hv3-raise)}
.hv3 .hv3-gtl{font-size:13.5px;font-weight:600;line-height:1.4;background:var(--hv3-raise)!important}
.hv3 button.hv3-gtc{font:inherit;text-align:left;border:0;cursor:pointer;transition:background .16s;display:block;width:100%}
.hv3 button.hv3-gtc:hover:not(.shown){background:var(--hv3-accent-soft)}
.hv3 .hv3-gtq{font-size:12.5px;color:var(--hv3-faint);font-style:italic}
.hv3 button.hv3-gtc.shown{cursor:default;background:var(--hv3-surface)}
.hv3 .hv3-gta{font-size:13.5px;font-weight:500;line-height:1.45;display:block}
.hv3 button.hv3-gtc small{display:block;font-size:11.5px;color:var(--hv3-accent-ink);font-weight:600;margin-top:4px}

/* 7) STEP_REVEAL */
.hv3 .hv3-steps{display:flex;flex-direction:column;gap:8px}
.hv3 .hv3-step{display:flex;gap:12px;align-items:flex-start;padding:13px 15px;border-radius:13px;border:1px solid var(--hv3-line);background:var(--hv3-surface);transition:all .2s}
.hv3 .hv3-step.pending{border-style:dashed;border-color:var(--hv3-accent);background:var(--hv3-accent-soft)}
.hv3 .hv3-step.locked{opacity:.4;padding:9px 15px}
.hv3 .hv3-sn{flex:none;width:23px;height:23px;border-radius:50%;background:var(--hv3-raise);border:1px solid var(--hv3-line);display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;color:var(--hv3-muted)}
.hv3 .hv3-step.open .hv3-sn{background:var(--hv3-accent);border-color:transparent;color:#fff}
.hv3 .hv3-st{font-size:14.5px;font-weight:600;line-height:1.4}
.hv3 .hv3-sd{font-size:13.5px;color:var(--hv3-muted);line-height:1.6;margin-top:4px}
.hv3 .hv3-sl{font-size:12px;font-weight:600;color:var(--hv3-accent-ink);margin-top:6px}
.hv3 .hv3-snote{font-size:12.5px;color:var(--hv3-amber-ink);background:var(--hv3-amber-soft);padding:7px 10px;border-radius:9px;margin-top:8px;line-height:1.5}

/* 8) INTERACTIVE_HIERARCHY */
.hv3 .hv3-pyr{display:flex;flex-direction:column;align-items:center;gap:6px;margin:6px 0 4px}
.hv3 button.hv3-lv{font:inherit;border:1px solid var(--hv3-line2);background:var(--hv3-surface);border-radius:12px;padding:11px 14px;cursor:pointer;text-align:center;transition:all .18s;min-width:150px}
.hv3 button.hv3-lv:hover{border-color:var(--hv3-accent)}
.hv3 button.hv3-lv.on{background:var(--hv3-accent-soft);border-color:var(--hv3-accent)}
.hv3 .hv3-lvt{font-size:14px;font-weight:600;display:block}
.hv3 button.hv3-lv small{display:block;font-size:11.5px;color:var(--hv3-faint);font-weight:500;margin-top:2px}
.hv3 button.hv3-lv.on small{color:var(--hv3-accent-ink)}
.hv3 .hv3-quiz{margin-top:20px;padding:16px 18px;border-radius:14px;background:var(--hv3-raise);border:1px solid var(--hv3-line)}
.hv3 .hv3-qq{font-size:14.5px;font-weight:600;margin-bottom:11px;line-height:1.45}
.hv3 .hv3-qopts{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.hv3 .hv3-qopts button{font:inherit;font-size:13.5px;font-weight:500;padding:11px 13px;border-radius:11px;border:1px solid var(--hv3-line2);background:var(--hv3-surface);cursor:pointer;text-align:left;line-height:1.4;transition:all .16s}
.hv3 .hv3-qopts button:hover:not(.done){border-color:var(--hv3-accent);background:var(--hv3-accent-soft)}
.hv3 .hv3-qopts button.done{cursor:default}
.hv3 .hv3-qopts button.ok{border-color:var(--hv3-green);background:var(--hv3-green-soft);color:var(--hv3-green-ink);font-weight:600}
.hv3 .hv3-qopts button.no{border-color:var(--hv3-red);background:var(--hv3-red-soft);color:var(--hv3-red-ink)}
.hv3 .hv3-qfb{font-size:13px;line-height:1.6;margin-top:11px;padding:11px 13px;border-radius:11px}
.hv3 .hv3-qfb.ok{background:var(--hv3-green-soft);color:var(--hv3-green-ink)}
.hv3 .hv3-qfb.no{background:var(--hv3-red-soft);color:var(--hv3-red-ink)}
.hv3 .hv3-qfb button{font:inherit;font-size:12.5px;font-weight:600;padding:5px 11px;border-radius:999px;border:1px solid currentColor;background:transparent;color:inherit;cursor:pointer}

/* 9) FAMILY_TREE — soy ağacı (miras hukuku) */
.hv3 .hv3-tree-wrap{position:relative}
.hv3 .hv3-tree-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;flex-wrap:wrap}
.hv3 .hv3-tree-legend{display:flex;flex-wrap:wrap;gap:14px;font-size:12px;color:var(--hv3-muted)}
.hv3 .hv3-tree-legend span{display:inline-flex;align-items:center;gap:6px}
.hv3 .hv3-tree-legend i{display:inline-block;width:16px;height:0;flex:none;border-top:2.25px solid var(--hv3-ink)}
.hv3 .hv3-tree-legend i.shape{width:14px;height:14px;border-top:none}
.hv3 .hv3-tree-legend i.circ{border-radius:50%;border:2px solid var(--hv3-ink)}
.hv3 .hv3-tree-legend i.tri{width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:13px solid var(--hv3-ink)}
.hv3 .hv3-tree-legend i.mb{border-radius:50%;background:var(--hv3-accent);border-top:none}
.hv3 .hv3-tree-legend i.dead{border-top:2.25px solid var(--hv3-red);transform:rotate(-30deg)}
.hv3 .hv3-tree-legend i.informal{border-top:2.25px dashed var(--hv3-ink)}
.hv3 .hv3-tree-legend i.divorced{border-top:2.25px solid var(--hv3-ink);position:relative}
.hv3 .hv3-tree-legend i.divorced::after{content:'✕';position:absolute;left:50%;top:-8px;transform:translateX(-50%);font-size:10px;color:var(--hv3-red)}
.hv3 button.hv3-tree-expand{font:inherit;font-size:12.5px;font-weight:600;color:var(--hv3-accent-ink);background:var(--hv3-accent-soft);border:1px solid var(--hv3-accent);border-radius:999px;padding:6px 14px;cursor:pointer;white-space:nowrap}
.hv3 .hv3-tree-frame{display:flex;gap:0}
.hv3 .hv3-tree-ruler{flex:none;width:26px;position:relative}
.hv3 .hv3-tree-ruler-lbl{position:absolute;left:13px;white-space:nowrap;font-size:10px;font-weight:700;letter-spacing:.03em;color:var(--hv3-faint);text-transform:uppercase;transform:translate(-50%,-50%) rotate(-90deg);transform-origin:center}
.hv3 .hv3-tree-stage{position:relative;flex:1;min-width:0;height:420px;
  background:var(--hv3-raise);
  border:1px solid var(--hv3-line);border-radius:20px;overflow:hidden;margin-bottom:14px;
  box-shadow:inset 0 1px 3px rgba(24,24,27,.04);
  transition:height .3s cubic-bezier(.22,.61,.36,1);
  cursor:grab;touch-action:none}
.hv3 .hv3-tree-stage.panning{cursor:grabbing}
.hv3 .hv3-tree-canvas{position:absolute;inset:0;width:100%;height:100%}
.hv3 .hv3-tree-panhint{font-size:11.5px;color:var(--hv3-faint);text-align:right;margin:-9px 2px 0}
.hv3 .hv3-tree-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
.hv3 .hv3-tree-svg line{stroke:var(--hv3-ink);stroke-opacity:.7;stroke-width:2px;stroke-linecap:round}
.hv3 .hv3-tree-svg line.informal{stroke-opacity:.8}
.hv3 .hv3-tree-svg line.divorced{stroke-opacity:.8}
.hv3 .hv3-tree-svg circle.hv3-stemdot{fill:var(--hv3-ink);fill-opacity:.7}
.hv3 .hv3-tree-svg text.hv3-tree-reltag{font-size:11px;font-weight:700;fill:var(--hv3-accent-ink)}
.hv3 .hv3-tree-svg text.hv3-tree-divx{font-size:15px;font-weight:700;fill:var(--hv3-red)}
/* ÇAPA KURALI: (x,y) noktası ŞEKLİN MERKEZİDİR, kutunun değil. translate(-50%,-26px):
   yatayda kutu ortalanır, dikeyde şeklin (52px) yarısı kadar yukarı çekilir → şekil merkezi
   tam (x,y)'ye oturur. Çizgiler de hiçbir ofset olmadan (x,y)'lere çizildiği için şekillerle
   KUSURSUZ birleşir (şekiller z-index ile çizgilerin üstünde, çizgi altından geçer). */
@keyframes hv3TreeNodeIn{from{opacity:0;transform:translate(-50%,-34px) scale(.85)}to{opacity:1;transform:translate(-50%,-26px) scale(1)}}
.hv3 .hv3-tnode{position:absolute;transform:translate(-50%,-26px);display:flex;flex-direction:column;align-items:center;width:118px;text-align:center;z-index:2;animation:hv3TreeNodeIn .5s cubic-bezier(.22,.61,.36,1) both}
.hv3 .hv3-tshape{position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:700;color:var(--hv3-surface);background:var(--hv3-ink);margin-bottom:7px;box-shadow:0 2px 6px rgba(24,24,27,.12);transition:transform .15s}
.hv3 .hv3-tnode:hover .hv3-tshape{transform:scale(1.05)}
.hv3 .hv3-tshape.circ{border-radius:50%;background:var(--hv3-surface);border:2.5px solid var(--hv3-ink);color:var(--hv3-ink)}
.hv3 .hv3-tshape.tri{background:transparent;box-shadow:none}
.hv3 .hv3-tshape.tri::before,.hv3 .hv3-tshape.tri::after{content:'';position:absolute;inset:0;clip-path:polygon(50% 2%,3% 97%,97% 97%)}
.hv3 .hv3-tshape.tri::before{background:var(--hv3-ink);filter:drop-shadow(0 2px 3px rgba(24,24,27,.14))}
.hv3 .hv3-tshape.tri::after{inset:3.5px;background:var(--hv3-surface)}
.hv3 .hv3-tshape.mb{border-radius:50%;background:var(--hv3-accent);color:var(--hv3-surface);font-size:22px;box-shadow:0 3px 10px rgba(91,91,214,.35)}
.hv3 .hv3-tshape.dead::after{content:'';position:absolute;left:-8px;right:-8px;top:50%;height:2.5px;background:var(--hv3-red);transform:rotate(-32deg);z-index:3;border-radius:2px}
.hv3 .hv3-tname{font-size:13px;font-weight:650;line-height:1.3}
.hv3 .hv3-tname small{display:block;font-weight:500;color:var(--hv3-faint);font-size:11px;margin-top:1px}
.hv3 button.hv3-tguess{font:inherit;margin-top:4px;font-size:11.5px;font-weight:600;color:var(--hv3-accent-ink);background:var(--hv3-accent-soft);border:1px dashed var(--hv3-accent);border-radius:999px;padding:3px 11px;cursor:pointer;transition:all .15s}
.hv3 button.hv3-tguess:hover{background:var(--hv3-accent);color:#fff;border-style:solid}
.hv3 button.hv3-tguess.open{cursor:default;background:var(--hv3-green-soft);border-style:solid;border-color:var(--hv3-green);color:var(--hv3-green-ink);font-size:14px;font-weight:700}
.hv3 button.hv3-tguess.open:hover{background:var(--hv3-green-soft);color:var(--hv3-green-ink)}
/* 28 Tem, 3. tur: gerekçe artık diyagram üstünde yüzen kutu değil, sahnenin altında birikimli
   panel — hiçbir kuşak yoğunluğunda düğümlerin üstüne binmez, ekran boyutundan bağımsız okunur. */
.hv3 .hv3-tree-detail{display:flex;flex-direction:column;gap:8px;margin-top:2px}
.hv3 .hv3-tree-detail-card{background:var(--hv3-surface);border:1px solid var(--hv3-line);border-radius:12px;padding:11px 14px;font-size:13px;line-height:1.55;color:var(--hv3-muted);animation:hv3fade .3s}
.hv3 .hv3-tree-detail-card b{display:block;color:var(--hv3-ink);font-size:13px;font-weight:650;margin-bottom:3px}
.hv3 .hv3-tree-detail-card b small{font-weight:500;color:var(--hv3-faint)}
.hv3 .hv3-tree-detail-card span{display:block}

/* Mirasçı tablosu: yasal mirasçı / yasal miras payı / saklı pay */
.hv3 .hv3-heir-table{border:1px solid var(--hv3-line);border-radius:14px;overflow:hidden;background:var(--hv3-surface);margin-top:4px}
.hv3 .hv3-htr{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:1px;background:var(--hv3-line)}
.hv3 .hv3-htr>*{background:var(--hv3-surface);padding:11px 14px;font-size:13.5px;line-height:1.4}
.hv3 .hv3-hth{background:var(--hv3-raise)!important;font-size:11.5px;font-weight:700;color:var(--hv3-faint);text-transform:uppercase;letter-spacing:.03em;padding:9px 14px!important}
.hv3 .hv3-htr .hv3-hname{font-weight:600;display:flex;align-items:center;gap:8px}
.hv3 .hv3-htr .hv3-hname i{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--hv3-accent);flex:none}
.hv3 .hv3-htr .hv3-hname i.dead{background:var(--hv3-faint)}
.hv3 .hv3-htr .hv3-hshare{font-weight:700;font-variant-numeric:tabular-nums}
.hv3 .hv3-htr .hv3-hreserved{color:var(--hv3-accent-ink);font-weight:600;font-variant-numeric:tabular-nums}
.hv3 .hv3-htr .hv3-hreserved.none{color:var(--hv3-faint);font-weight:500}
.hv3 .hv3-heir-caption{font-size:12px;color:var(--hv3-faint);margin:8px 2px 18px;line-height:1.5}

/* Tam ekran modu */
.hv3-tree-fullscreen{position:fixed;inset:0;z-index:9999;background:var(--hv3-surface, #FAF9F6);padding:22px 26px 30px;overflow:auto}
.hv3-tree-fullscreen .hv3-tree-stage{height:min(72vh,640px)}
.hv3-tree-fullscreen-close{position:sticky;top:0;float:right;font:inherit;font-size:13.5px;font-weight:600;color:var(--hv3-ink);background:var(--hv3-surface);border:1px solid var(--hv3-line2);border-radius:999px;padding:8px 16px;cursor:pointer;z-index:10;box-shadow:0 2px 8px rgba(24,24,27,.08)}
body.hv3-scroll-lock{overflow:hidden}

@media(max-width:600px){
  .hv3 .hv3-bins{grid-template-columns:1fr}
  .hv3 .hv3-qopts{grid-template-columns:1fr}
  .hv3 .hv3-gtr{grid-template-columns:1fr!important}
  .hv3 .hv3-gth{display:none}
  .hv3 .hv3-tree-stage{height:420px}
  .hv3 .hv3-htr{grid-template-columns:1.2fr 1fr .8fr}
  .hv3 .hv3-tree-legend{gap:9px;font-size:11px}
  .hv3 .hv3-tree-ruler{width:18px}
  .hv3 .hv3-tree-ruler-lbl{font-size:9px}
  /* 28 Tem: dar ekranlarda sabit 118px genişlikli düğüm, %14 kenar boşluğuna rağmen taşabiliyordu — küçült. */
  .hv3 .hv3-tnode{width:92px}
  .hv3 .hv3-tshape{width:44px;height:44px;font-size:16px}
  .hv3 .hv3-tname{font-size:12px}
  .hv3 .hv3-tname small{font-size:10px}
}
`;
    const el = document.createElement('style');
    el.id = 'hv3-css';
    el.textContent = css;
    document.head.appendChild(el);
  }

  const TONE = {
    red: { ink: 'var(--hv3-red)', soft: 'var(--hv3-red-soft)' },
    green: { ink: 'var(--hv3-green)', soft: 'var(--hv3-green-soft)' },
    amber: { ink: 'var(--hv3-amber)', soft: 'var(--hv3-amber-soft)' },
    ok: { ink: 'var(--hv3-green-ink)' }, no: { ink: 'var(--hv3-red-ink)' }
  };
  function tone(t) { return TONE[t] || { ink: 'var(--hv3-ink)', soft: 'var(--hv3-raise)' }; }

  /* ---------- 1) DECISION_SIM ---------- */
  function matchCategory(cats, ans) {
    for (const c of (cats || [])) {
      const all = c.allOf || [];
      const allOk = all.every(cd => ans[cd.q] === cd.v);
      const anyOk = !c.anyOf || c.anyOf.some(cd => ans[cd.q] === cd.v);
      if (all.length && allOk && anyOk) return c;
      if (!all.length && c.anyOf && anyOk) return c;
    }
    return null;
  }
  function decisionSim(root, vd) {
    const ans = {};
    root.innerHTML =
      (vd.title ? `<div class="hv3-h">${vd.title}</div>` : '') +
      `<div class="hv3-qs"></div>
       <div class="hv3-res" data-el="res"><div class="hv3-rt" data-el="rt">Durumu seç</div><div class="hv3-rd" data-el="rd">Soruları cevapla, kategori belirsin.</div></div>
       <div class="hv3-grid" data-el="islem"></div>
       <div class="hv3-trap" data-el="trap" style="display:none"></div>`;
    const qsEl = root.querySelector('.hv3-qs');
    (vd.questions || []).forEach(q => {
      const row = document.createElement('div'); row.className = 'hv3-row';
      row.innerHTML = `<div class="hv3-lbl">${q.label}<small>${q.law || ''}</small></div>`;
      const seg = document.createElement('div'); seg.className = 'hv3-seg';
      (q.opts || []).forEach(o => {
        const b = document.createElement('button'); b.textContent = o.t;
        b.addEventListener('click', () => {
          ans[q.id] = o.v;
          Array.from(seg.children).forEach(x => x.classList.remove('on'));
          b.classList.add('on'); evalNow();
        });
        seg.appendChild(b);
      });
      row.appendChild(seg); qsEl.appendChild(row);
    });
    function evalNow() {
      const cat = matchCategory(vd.categories, ans);
      const res = root.querySelector('[data-el=res]');
      const rt = root.querySelector('[data-el=rt]'), rd = root.querySelector('[data-el=rd]');
      const isl = root.querySelector('[data-el=islem]'), tr = root.querySelector('[data-el=trap]');
      if (!cat) { rt.textContent = 'Cevaplamaya devam et'; rd.textContent = 'Kalan soruları da cevapla.'; isl.innerHTML = ''; tr.style.display = 'none'; res.style.background = 'var(--hv3-raise)'; return; }
      const tn = tone(cat.tone);
      res.style.background = tn.soft;
      rt.innerHTML = `<span style="color:${tn.ink}">${cat.ad}</span><span class="hv3-pill">${cat.m || ''}</span>`;
      rd.textContent = cat.desc || '';
      const islem = cat.islem || [];
      isl.style.display = islem.length ? 'grid' : 'none';
      isl.innerHTML = islem.map(it => `<div class="hv3-mini"><div class="hv3-mt">${it[0]}</div><div class="hv3-mv" style="color:${tone(it[2]).ink}">${it[1]}</div></div>`).join('');
      if (cat.trap) { tr.style.display = 'block'; tr.innerHTML = '<b>Sınav tuzağı:</b> ' + cat.trap; } else tr.style.display = 'none';
    }
  }

  /* ---------- 2) CALCULATOR (miras_zumre) ---------- */
  function fracStr(n) { const m = { 0.75: '3/4', 0.5: '1/2', 0.25: '1/4', 1: 'Tamamı', 0.375: '3/8', 0.125: '1/8' }; return m[n] || (Math.round(n * 1000) / 1000).toString(); }
  function money(x) { return '₺' + Math.round(x).toLocaleString('tr-TR'); }
  function calcMirasZumre(root, vd) {
    const st = { es: 0, zum: 0 };
    root.innerHTML =
      (vd.title ? `<div class="hv3-h">${vd.title}</div>` : '') +
      `<div class="hv3-row"><div class="hv3-lbl">Tereke değeri</div><input type="number" data-el="val" value="3000000" min="0" step="100000"></div>
       <div class="hv3-row"><div class="hv3-lbl">Sağ kalan eş</div><div class="hv3-seg" data-el="es">${['Var', 'Yok'].map((o, i) => `<button data-v="${i}" class="${i === 0 ? 'on' : ''}">${o}</button>`).join('')}</div></div>
       <div class="hv3-row"><div class="hv3-lbl">Birlikte mirasçı zümre<small>1 altsoy · 2 ana-baba · 3 büyük ana-baba</small></div><div class="hv3-seg" data-el="zum">${['1.', '2.', '3.', 'Yok'].map((o, i) => `<button data-v="${i}" class="${i === 0 ? 'on' : ''}">${o}</button>`).join('')}</div></div>
       <div class="hv3-row" data-el="nrow"><div class="hv3-lbl">Zümredeki kişi sayısı</div><input type="number" data-el="n" value="2" min="1" max="10" step="1" style="width:110px"></div>
       <div class="hv3-calc" data-el="out"></div>
       <div class="hv3-law" data-el="law"></div>
       <div class="hv3-trap"><b>Sınav tuzağı:</b> Eşin payı zümreye göre değişir — 1. zümreyle <b>1/4</b>, 2. ile <b>1/2</b>, 3. ile <b>3/4</b>. Hiç kan hısmı yoksa tamamı eşe (m.501).</div>`;
    const valEl = root.querySelector('[data-el=val]'), nEl = root.querySelector('[data-el=n]');
    valEl.addEventListener('input', calc); nEl.addEventListener('input', calc);
    root.querySelectorAll('[data-el=es] button').forEach(b => b.addEventListener('click', () => { setSeg(root, '[data-el=es]', b); st.es = +b.dataset.v; calc(); }));
    root.querySelectorAll('[data-el=zum] button').forEach(b => b.addEventListener('click', () => { setSeg(root, '[data-el=zum]', b); st.zum = +b.dataset.v; calc(); }));
    calc();
    function calc() {
      const val = +valEl.value || 0, n = Math.max(1, +nEl.value || 1);
      root.querySelector('[data-el=nrow]').style.display = st.zum === 3 ? 'none' : 'flex';
      let es = 0, zum = 0, law = '';
      if (st.zum === 3) {
        if (st.es === 0) { es = 1; law = 'Kan hısmı yok → terekenin tamamı sağ kalan eşe (TMK m.501).'; }
        else law = 'Ne eş ne zümre → miras Hazineye kalır (TMK m.501/son).';
      } else {
        const r = st.es === 0 ? [0.25, 0.5, 0.75][st.zum] : 0;
        es = r; zum = 1 - r;
        const ad = ['1. zümre (altsoy)', '2. zümre (ana-baba)', '3. zümre (büyük ana-baba)'][st.zum];
        law = st.es === 0 ? `Eş + ${ad}: eş ${fracStr(r)}, kalan ${fracStr(1 - r)} zümrede ${n} kişiye eşit.` : `Eş yok → tamamı ${ad} içinde ${n} kişiye eşit (halefiyet).`;
      }
      const per = zum / n; let c = '';
      if (st.zum === 3) c = st.es === 0 ? cell('Sağ kalan eş', 1, val) : cell('Hazine', 1, val);
      else { if (st.es === 0) c += cell('Sağ kalan eş', es, es * val); for (let i = 1; i <= n; i++) c += cell('Mirasçı ' + i, per, per * val); }
      root.querySelector('[data-el=out]').innerHTML = c;
      root.querySelector('[data-el=law]').textContent = law;
    }
    function cell(name, f, tl) { return `<div class="hv3-cell"><div class="hv3-cn">${name}</div><div class="hv3-cf">${fracStr(f)}</div><div class="hv3-cm">${money(tl)}</div></div>`; }
  }
  function setSeg(root, sel, btn) { root.querySelectorAll(sel + ' button').forEach(x => x.classList.remove('on')); btn.classList.add('on'); }

  /* ---------- 3) SCENE_STORY ---------- */
  function sceneStory(root, vd) {
    const scenes = vd.scenes || [];
    let i = 0;
    root.innerHTML =
      (vd.title ? `<div class="hv3-h">${vd.title}</div>` : '') +
      `<div class="hv3-dots" data-el="dots"></div>
       <div class="hv3-stage" data-el="stage"></div>
       <div class="hv3-nav"><button data-el="prev">‹ Önceki</button><div class="hv3-cap" data-el="cap"></div><button data-el="next">Sonraki ›</button></div>
       <div class="hv3-ask" data-el="ask"></div>
       <div class="hv3-tell" data-el="tell"></div>
       <div class="hv3-law" data-el="law"></div>`;
    /* Hangi sahnede cevap verildi — sahneler arası gidip gelirken kaybolmasın. */
    const answered = {};
    const prev = root.querySelector('[data-el=prev]'), next = root.querySelector('[data-el=next]');
    prev.addEventListener('click', () => { if (i > 0) { i--; draw(); } });
    next.addEventListener('click', () => { if (i < scenes.length - 1) { i++; draw(); } });
    draw();
    function draw() {
      root.querySelector('[data-el=dots]').innerHTML = scenes.map((_, k) => `<i style="background:${k <= i ? 'var(--hv3-accent)' : 'var(--hv3-line2)'}"></i>`).join('');
      const sc = scenes[i] || {};
      let html = sc.html || '';
      if (sc.guess) html = `<div style="position:absolute;inset:0;padding:14px 16px;overflow:auto" data-el="guess"></div>`;
      root.querySelector('[data-el=stage]').innerHTML = `<div class="hv3-sc">${html}</div>`;
      if (sc.guess) {
        const g = root.querySelector('[data-el=guess]');
        g.innerHTML = sc.guess.map((r, k) => `<div style="padding:9px 2px;border-bottom:1px solid var(--hv3-line);cursor:pointer" data-gi="${k}"><b style="font-size:12.5px">${r[0]}</b><div data-gh="${k}" style="font-size:12.5px;color:var(--hv3-faint);margin-top:3px">tahmin için dokun…</div></div>`).join('');
        g.querySelectorAll('[data-gi]').forEach(row => row.addEventListener('click', () => {
          const k = +row.dataset.gi;
          row.querySelector('[data-gh="' + k + '"]').innerHTML = `<span style="color:var(--hv3-red-ink)">${sc.guess[k][1]}</span><br><span style="color:var(--hv3-green-ink)">${sc.guess[k][2]}</span>`;
        }));
      }
      root.querySelector('[data-el=cap]').textContent = sc.cap || '';

      /* ---- Geri-çağırma kapısı (standart v4.1 §B.0.6) ----
         Sahnede `ask` varsa anlatım ve mevzuat, kullanıcı bir şık seçene kadar
         GİZLİDİR. Amaç: metni ön okuma değil, kendi tahmininin CEVABI olarak
         okutmak. Yanlış cevap cezalandırılmaz — açıklanır (Kornell & Bjork:
         başarısız geri-çağırma denemesi de öğrenmeyi artırır, geri bildirim
         hemen gelirse). `ask` yoksa sahne v4.0'daki gibi davranır. */
      const askEl = root.querySelector('[data-el=ask]');
      const gated = !!(sc.ask && sc.ask.opts && sc.ask.opts.length);
      const open = !gated || answered[i] !== undefined;

      if (gated) {
        askEl.style.display = '';
        askEl.innerHTML =
          `<div class="hv3-askq">${sc.ask.q || ''}</div>` +
          `<div class="hv3-askopts" data-el="opts"></div>` +
          `<div class="hv3-askfb" data-el="fb" style="display:none"></div>`;
        const optsEl = askEl.querySelector('[data-el=opts]');
        sc.ask.opts.forEach((o, oi) => {
          const b = document.createElement('button');
          b.className = 'hv3-asko';
          b.type = 'button';
          b.innerHTML = o.t;
          b.addEventListener('click', () => { if (answered[i] === undefined) { answered[i] = oi; draw(); } });
          optsEl.appendChild(b);
        });
        if (answered[i] !== undefined) {
          const pick = answered[i], chosen = sc.ask.opts[pick] || {};
          optsEl.querySelectorAll('.hv3-asko').forEach((b, oi) => {
            b.disabled = true;
            if (sc.ask.opts[oi].ok) b.classList.add('ok');
            else if (oi === pick) b.classList.add('no');
            if (oi === pick) b.classList.add('picked');
          });
          const fb = askEl.querySelector('[data-el=fb]');
          fb.style.display = '';
          fb.className = 'hv3-askfb ' + (chosen.ok ? 'ok' : 'no');
          fb.innerHTML =
            `<b>${chosen.ok ? '✓ Doğru' : '✗ Değil'}</b> — ` +
            (chosen.why || (chosen.ok ? 'Kural tam da bu.' : 'Aşağıdaki anlatım nedenini açıklıyor.'));
        }
      } else {
        askEl.innerHTML = ''; askEl.style.display = 'none';
      }

      /* Anlatım bloğu (standart v4 §B.0): konu gövdesi sahneye gömülür.
         Boşsa DOM'dan düşürülür ki eski sahneler aynen çalışsın. */
      const tellEl = root.querySelector('[data-el=tell]');
      if (sc.tell && open) {
        tellEl.innerHTML = sc.tell;
        tellEl.style.display = '';
        // yeniden çalışsın diye animasyonu resetle
        tellEl.style.animation = 'none'; void tellEl.offsetWidth; tellEl.style.animation = '';
      } else {
        tellEl.innerHTML = ''; tellEl.style.display = 'none';
      }

      /* law artık HTML kabul eder (madde no'ları vurgulanabilsin). */
      const lawEl = root.querySelector('[data-el=law]');
      if (sc.law && open) { lawEl.innerHTML = sc.law; lawEl.style.display = ''; }
      else { lawEl.innerHTML = ''; lawEl.style.display = 'none'; }

      prev.disabled = i === 0; next.disabled = i === scenes.length - 1;
    }
  }

  /* ---------- 4) DRAG_CLASSIFY ---------- */
  function dragClassify(root, vd) {
    const bins = vd.bins || [], items = vd.items || [];
    let dragIdx = null, ok = 0;
    const binName = {}; bins.forEach(b => binName[b.id] = b.title);
    root.innerHTML =
      (vd.title ? `<div class="hv3-h">${vd.title}</div>` : '') +
      `<div class="hv3-hint">Kalan olaylar</div>
       <div class="hv3-chips" data-el="chips"></div>
       <div class="hv3-bins">${bins.map(b => `<div class="hv3-bin" data-bin="${b.id}"><h4>${b.title}<br><span>${b.sub || ''}</span></h4><div data-drop="${b.id}"></div></div>`).join('')}</div>
       <div class="hv3-score" data-el="score"></div>`;
    const chipsEl = root.querySelector('[data-el=chips]');
    items.forEach((it, idx) => {
      const c = document.createElement('div'); c.className = 'hv3-chip'; c.draggable = true; c.textContent = it.t;
      c.addEventListener('dragstart', e => { dragIdx = idx; e.dataTransfer.effectAllowed = 'move'; });
      c.dataset.idx = idx; chipsEl.appendChild(c);
    });
    root.querySelectorAll('.hv3-bin').forEach(bin => {
      bin.addEventListener('dragover', e => { e.preventDefault(); bin.classList.add('over'); });
      bin.addEventListener('dragleave', () => bin.classList.remove('over'));
      bin.addEventListener('drop', e => { e.preventDefault(); bin.classList.remove('over'); drop(bin.dataset.bin); });
    });
    updScore();
    function drop(binId) {
      if (dragIdx === null) return;
      const it = items[dragIdx], chip = chipsEl.querySelector(`[data-idx="${dragIdx}"]`);
      if (!chip || chip.classList.contains('placed')) return;
      const correct = it.bin === binId;
      const d = document.createElement('div');
      d.className = 'hv3-drop ' + (correct ? 'hv3-ok' : 'hv3-no');
      d.textContent = (correct ? '✓ ' : '✗ ') + it.t + (correct ? '' : ` → ${binName[it.bin]}`);
      root.querySelector(`[data-drop="${binId}"]`).appendChild(d);
      chip.classList.add('placed');
      if (correct) ok++;
      dragIdx = null; updScore();
    }
    function updScore() {
      const placed = chipsEl.querySelectorAll('.placed').length;
      root.querySelector('[data-el=score]').textContent = `Doğru ${ok} · yerleştirilen ${placed}/${items.length}` +
        (placed === items.length ? (ok === items.length ? ' — kusursuz 🎯' : ' — yanlışları incele') : '');
    }
  }

  /* ---------- 5) TIME_SLIDER ---------- */
  function timeSlider(root, vd) {
    const max = vd.maxDays || vd.max || 100, unit = vd.unit || 'gün', step = vd.step || 1;
    const markers = vd.markers || [], thresholds = vd.thresholds || [];
    root.innerHTML =
      (vd.title ? `<div class="hv3-h">${vd.title}</div>` : '') +
      `<div style="display:flex;align-items:baseline;gap:9px;margin:4px 0 6px"><span class="hv3-cf" data-el="val" style="font-size:30px">0</span><span style="font-size:14px;color:var(--hv3-muted)">${unit}</span></div>
       <input type="range" min="0" max="${max}" value="0" step="${step}" data-el="slider" style="width:100%;accent-color:var(--hv3-accent);cursor:pointer">
       <div data-el="th" style="margin-top:18px;display:flex;flex-direction:column;gap:8px"></div>
       <div class="hv3-law" data-el="law"></div>`;
    const slider = root.querySelector('[data-el=slider]');
    slider.addEventListener('input', upd); upd();
    function upd() {
      const v = +slider.value;
      root.querySelector('[data-el=val]').textContent = v.toLocaleString('tr-TR');
      root.querySelector('[data-el=th]').innerHTML = thresholds.map(t => {
        const mode = t.mode || 'gain', reached = v >= t.at;
        const active = mode === 'gain' ? reached : !reached;
        const txt = mode === 'gain' ? (reached ? '✓ artık mümkün' : '· henüz erken') : (reached ? '✗ süre doldu' : '✓ süre içinde');
        const col = active ? 'var(--hv3-green-ink)' : 'var(--hv3-red-ink)';
        const bg = active ? 'var(--hv3-green-soft)' : 'var(--hv3-red-soft)';
        return `<div style="display:flex;justify-content:space-between;gap:10px;padding:10px 13px;border-radius:10px;background:${bg}"><span style="font-size:13.5px;font-weight:500">${t.label}<small style="display:block;color:var(--hv3-faint);font-weight:500;margin-top:1px">${t.law || ''} · ${t.at} ${unit}</small></span><span style="font-size:12.5px;font-weight:600;color:${col};white-space:nowrap">${txt}</span></div>`;
      }).join('');
      let cur = null; markers.forEach(m => { if (v >= m.at) cur = m; });
      const law = root.querySelector('[data-el=law]');
      if (cur) { law.style.display = 'block'; law.innerHTML = '<b>' + (cur.label || '') + ':</b> ' + (cur.law || ''); }
      else if (vd.law) { law.style.display = 'block'; law.textContent = vd.law; }
      else law.style.display = 'none';
    }
  }

  /* ---------- 2b) CALCULATOR (mal_rejimi) ---------- */
  function calcMalRejimi(root, vd) {
    root.innerHTML =
      (vd.title ? `<div class="hv3-h">${vd.title}</div>` : '') +
      `<div class="hv3-row"><div class="hv3-lbl">Eş A'nın artık değeri<small>edinilmiş mal − borçlar (TMK m.231)</small></div><input type="number" data-el="a" value="800000" min="0" step="50000"></div>
       <div class="hv3-row"><div class="hv3-lbl">Eş B'nin artık değeri</div><input type="number" data-el="b" value="200000" min="0" step="50000"></div>
       <div class="hv3-calc" data-el="out"></div>
       <div class="hv3-law" data-el="law"></div>
       <div class="hv3-trap"><b>Sınav tuzağı:</b> Katılma alacağı, her eşe diğerinin artık değerinin <b>yarısı</b> kadardır (TMK m.236). Kişisel mallar ile miras/bağış yoluyla edinilenler artık değere katılmaz.</div>`;
    const a = root.querySelector('[data-el=a]'), b = root.querySelector('[data-el=b]');
    a.addEventListener('input', calc); b.addEventListener('input', calc); calc();
    function calc() {
      const av = +a.value || 0, bv = +b.value || 0;
      const aAl = bv / 2, bAl = av / 2, net = aAl - bAl;
      const txt = net > 0 ? `Eş A, Eş B'den net ${money(Math.abs(net))} alır` : net < 0 ? `Eş B, Eş A'dan net ${money(Math.abs(net))} alır` : 'Denk — kimse borçlu değil';
      root.querySelector('[data-el=out]').innerHTML =
        c2("A'nın katılma alacağı", aAl) + c2("B'nin katılma alacağı", bAl) + c2("Netleştirme", Math.abs(net));
      root.querySelector('[data-el=law]').textContent = txt + ' (TMK m.236 — artık değerin yarısı).';
    }
    function c2(name, tl) { return `<div class="hv3-cell"><div class="hv3-cn">${name}</div><div class="hv3-cf" style="font-size:21px">${money(tl)}</div></div>`; }
  }

  /* ---------- 6) GUESS_TABLE — tablonun tek meşru hali ----------
     Hücreler gizli. Kullanıcı önce tahmin eder, tıklar, açılır; skor tutulur.
     vd = { title, hint, headers:[...], rows:[{ label, cells:[{ guess?, text, law? }] }], trap }
  */
  function guessTable(root, vd) {
    const headers = vd.headers || [];
    const rows = vd.rows || [];
    const total = rows.reduce((a, r) => a + (r.cells || []).length, 0);
    let opened = 0;

    root.innerHTML =
      (vd.title ? `<div class="hv3-h">${vd.title}</div>` : '') +
      `<p class="hv3-hint">${vd.hint || 'Her hücreyi açmadan önce cevabı kendine söyle. Sonra tıkla — tahminini doğrula.'}</p>
       <div class="hv3-gt" data-el="tbl">
         <div class="hv3-gtr hv3-gth" style="grid-template-columns:minmax(120px,1.1fr) repeat(${Math.max(1, headers.length)},1fr)">
           <div></div>${headers.map(h => `<div>${h}</div>`).join('')}
         </div>
         ${rows.map((r, ri) => `
           <div class="hv3-gtr" style="grid-template-columns:minmax(120px,1.1fr) repeat(${Math.max(1, headers.length)},1fr)">
             <div class="hv3-gtl">${r.label || ''}</div>
             ${(r.cells || []).map((c, ci) => `
               <button class="hv3-gtc" data-r="${ri}" data-c="${ci}">
                 <span class="hv3-gtq">${c.guess || 'tahmin et'}</span>
               </button>`).join('')}
           </div>`).join('')}
       </div>
       <div class="hv3-score" data-el="score"></div>
       <div class="hv3-nav"><button data-el="all">Tümünü aç</button><span class="hv3-cap" data-el="cap"></span><button data-el="reset">Sıfırla</button></div>
       ${vd.trap ? `<div class="hv3-trap"><b>Sınav tuzağı:</b> ${vd.trap}</div>` : ''}`;

    root.querySelectorAll('.hv3-gtc').forEach(btn => btn.addEventListener('click', () => open(btn)));
    root.querySelector('[data-el=all]').addEventListener('click', () => root.querySelectorAll('.hv3-gtc').forEach(open));
    root.querySelector('[data-el=reset]').addEventListener('click', () => { opened = 0; guessTable(root, vd); });
    upd();

    function open(btn) {
      if (btn.classList.contains('shown')) return;
      const c = (rows[+btn.dataset.r].cells || [])[+btn.dataset.c] || {};
      btn.classList.add('shown');
      btn.innerHTML = `<span class="hv3-gta">${c.text || '—'}</span>` +
        (c.law ? `<small>${c.law}</small>` : '');
      opened++;
      upd();
    }
    function upd() {
      root.querySelector('[data-el=score]').textContent =
        opened === 0 ? '' : `${opened} / ${total} hücre açıldı`;
      root.querySelector('[data-el=cap]').textContent =
        opened >= total ? 'Tablo tamamlandı' : 'Önce tahmin et, sonra aç';
    }
  }

  /* ---------- 7) STEP_REVEAL — usul süreçleri ----------
     Her adımda "sırada ne var?" tahmini, sonra adım açılır.
     vd = { title, steps:[{ label, desc, law, note }], trap }
  */
  function stepReveal(root, vd) {
    const steps = vd.steps || [];
    let shown = 0; // kaç adım açıldı

    root.innerHTML =
      (vd.title ? `<div class="hv3-h">${vd.title}</div>` : '') +
      `<div class="hv3-dots" data-el="dots">${steps.map(() => '<i></i>').join('')}</div>
       <div data-el="list" class="hv3-steps"></div>
       <div class="hv3-nav">
         <button data-el="back">Geri</button>
         <span class="hv3-cap" data-el="cap"></span>
         <button data-el="next">Sırada ne var?</button>
       </div>
       ${vd.trap ? `<div class="hv3-trap"><b>Sınav tuzağı:</b> ${vd.trap}</div>` : ''}`;

    root.querySelector('[data-el=next]').addEventListener('click', () => { if (shown < steps.length) { shown++; draw(); } });
    root.querySelector('[data-el=back]').addEventListener('click', () => { if (shown > 0) { shown--; draw(); } });
    draw();

    function draw() {
      root.querySelector('[data-el=list]').innerHTML = steps.map((s, i) => {
        if (i < shown) {
          return `<div class="hv3-step open">
            <span class="hv3-sn">${i + 1}</span>
            <div><div class="hv3-st">${s.label || ''}</div>
            ${s.desc ? `<div class="hv3-sd">${s.desc}</div>` : ''}
            ${s.law ? `<div class="hv3-sl">${s.law}</div>` : ''}
            ${s.note ? `<div class="hv3-snote">${s.note}</div>` : ''}</div></div>`;
        }
        if (i === shown) {
          return `<div class="hv3-step pending">
            <span class="hv3-sn">${i + 1}</span>
            <div class="hv3-st" style="color:var(--hv3-faint)">Bu adımda ne olur? — tahmin et, sonra aç</div></div>`;
        }
        return `<div class="hv3-step locked"><span class="hv3-sn">${i + 1}</span><div class="hv3-st">·</div></div>`;
      }).join('');

      root.querySelectorAll('[data-el=dots] i').forEach((d, i) => {
        d.style.background = i < shown ? 'var(--hv3-accent)' : 'var(--hv3-line2)';
      });
      root.querySelector('[data-el=back]').disabled = shown === 0;
      const nx = root.querySelector('[data-el=next]');
      nx.disabled = shown >= steps.length;
      nx.textContent = shown >= steps.length ? 'Süreç tamam' : 'Sırada ne var?';
      root.querySelector('[data-el=cap]').textContent = `${shown} / ${steps.length} adım`;
    }
  }

  /* ---------- 8) INTERACTIVE_HIERARCHY — katmanlı yapılar ----------
     Katmana tıklayınca istisnalar + çıkmış soru tuzağı açılır.
     Ardından "hangisi üstün?" mini testi.
     vd = { title, levels:[{ label, law, desc, exceptions:[...] }], quiz:[{ q, a, b, correct, why }], trap }
  */
  function interactiveHierarchy(root, vd) {
    const levels = vd.levels || [];
    const quiz = vd.quiz || [];
    let sel = -1, qi = 0, score = 0, answered = false;

    root.innerHTML =
      (vd.title ? `<div class="hv3-h">${vd.title}</div>` : '') +
      `<p class="hv3-hint">Katmanlara tıkla — her birinin istisnası ve sınav tuzağı açılır. Üstteki norm alttakini bağlar.</p>
       <div class="hv3-pyr" data-el="pyr"></div>
       <div class="hv3-res" data-el="det" style="display:none"></div>
       ${quiz.length ? `<div class="hv3-quiz" data-el="quiz"></div>` : ''}
       ${vd.trap ? `<div class="hv3-trap"><b>Sınav tuzağı:</b> ${vd.trap}</div>` : ''}`;

    drawPyr();
    if (quiz.length) drawQuiz();

    function drawPyr() {
      root.querySelector('[data-el=pyr]').innerHTML = levels.map((l, i) => {
        const w = 100 - i * (35 / Math.max(1, levels.length - 1));
        return `<button class="hv3-lv ${i === sel ? 'on' : ''}" data-i="${i}" style="width:${w}%">
          <span class="hv3-lvt">${l.label || ''}</span>
          ${l.law ? `<small>${l.law}</small>` : ''}
        </button>`;
      }).join('');
      root.querySelectorAll('.hv3-lv').forEach(b => b.addEventListener('click', () => {
        sel = +b.dataset.i; drawPyr(); drawDet();
      }));
    }

    function drawDet() {
      const d = root.querySelector('[data-el=det]');
      const l = levels[sel];
      if (!l) { d.style.display = 'none'; return; }
      d.style.display = 'block';
      d.innerHTML =
        `<div class="hv3-rt">${l.label || ''} ${l.law ? `<span class="hv3-pill">${l.law}</span>` : ''}</div>
         ${l.desc ? `<div class="hv3-rd">${l.desc}</div>` : ''}
         ${(l.exceptions || []).length ? `<div class="hv3-grid">${l.exceptions.map(e =>
            `<div class="hv3-mini"><div class="hv3-mt">İstisna</div><div class="hv3-mv">${typeof e === 'string' ? e : (e.text || '')}</div></div>`).join('')}</div>` : ''}
         ${l.trap ? `<div class="hv3-trap" style="margin-top:14px">${l.trap}</div>` : ''}`;
    }

    function drawQuiz() {
      const q = quiz[qi];
      const box = root.querySelector('[data-el=quiz]');
      if (!q) {
        box.innerHTML = `<div class="hv3-score">Mini test bitti — ${score} / ${quiz.length} doğru</div>
          <div class="hv3-nav"><span class="hv3-cap"></span><button data-el="requiz">Yeniden dene</button></div>`;
        box.querySelector('[data-el=requiz]').addEventListener('click', () => { qi = 0; score = 0; answered = false; drawQuiz(); });
        return;
      }
      box.innerHTML =
        `<div class="hv3-qq">${q.q || 'Hangisi üstün?'}</div>
         <div class="hv3-qopts">
           <button data-k="a">${q.a}</button>
           <button data-k="b">${q.b}</button>
         </div>
         <div class="hv3-qfb" data-el="fb" style="display:none"></div>
         <div class="hv3-score">${qi + 1} / ${quiz.length} · ${score} doğru</div>`;
      answered = false;
      box.querySelectorAll('.hv3-qopts button').forEach(b => b.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const ok = b.dataset.k === q.correct;
        if (ok) score++;
        box.querySelectorAll('.hv3-qopts button').forEach(x => {
          x.classList.add('done');
          if (x.dataset.k === q.correct) x.classList.add('ok');
          else if (x === b) x.classList.add('no');
        });
        const fb = box.querySelector('[data-el=fb]');
        fb.style.display = 'block';
        fb.className = 'hv3-qfb ' + (ok ? 'ok' : 'no');
        fb.innerHTML = `<b>${ok ? 'Doğru.' : 'Yanlış.'}</b> ${q.why || ''}
          <button data-el="qnext" style="margin-left:8px">Sonraki →</button>`;
        // Skor satırı cevaptan SONRA güncellenmeli — yoksa hep bir soru geriden gelir.
        const sc = box.querySelector('.hv3-score');
        if (sc) sc.textContent = `${qi + 1} / ${quiz.length} · ${score} doğru`;
        fb.querySelector('[data-el=qnext]').addEventListener('click', () => { qi++; drawQuiz(); });
      }));
    }
  }

  /* ---------- 9) FAMILY_TREE — soy ağacı (miras hukuku) ----------
     Genogram: daire = kadın, üçgen = erkek, ⊗ = mirasbırakan, çapraz çizgi = önce vefat.
     Paylar (`sub`) başta gizli; düğüme dokununca açılır + gerekçe (`reason`) gösterilir.
     Birden çok pratik örneği arasında gezinilir (Önceki/Sonraki örnek).
     Her örnek için "Yasal Mirasçı / Yasal Miras Payı / Saklı Pay" tablosu üretilir.

     26 Tem, 2. tur — kullanıcı geri bildirimi üzerine kökten revizyon:
     1) Bağlantı çizgileri gerçekten GÖRÜNMÜYORDU: SVG viewBox="0 0 100 100" + niceleştirilmemiş
        (preserveAspectRatio=none) container'a gerilince stroke-width yöne göre bozuluyordu, üstelik
        soy bağı çizgileri (ebeveyn→çocuk) hiç sınıf almadan soluk/ince varsayılanı kullanıyordu.
        Artık SVG'nin viewBox'ı sahnenin GERÇEK piksel boyutuyla kuruluyor (bkz. buildLinesSvg) —
        çizgiler her yönde tutarlı kalınlıkta, koyu, net.
     2) Elle x/y tahmini karmaşaya/çakışmaya yol açıyordu. Artık node'lara x/y yerine `gen` (kuşak no:
        negatif=üstsoy, 0=mirasbırakan kuşağı, pozitif=altsoy) verilebilir; yerleşim OTOMATİK hesaplanır
        (bkz. autoLayoutGenerations) — ebeveyn ortasına ortalanmış çocuklar, çakışma önleme. Eski x/y
        veren node'lar dokunulmadan aynen kullanılır (geriye dönük uyumlu, mevcut testler bozulmaz).
     3) İlişki türü ayrımı: unions[].type — 'marriage' (çift çizgi, vsy.), 'informal' (kesikli tek çizgi +
        "evlilik dışı ilişki" etiketi — TMK'da soybağı kurulmuş her çocuk ebeveynin evli olup olmamasından
        bağımsız TAM ve EŞİT mirasçıdır, bu görsel o ayrımı yanlış izlenim vermeden gösterir), 'divorced'
        (çift çizgi + ✕ işareti).
     4) Kuşak etiketleri: sahnenin solunda "Üstsoy / Mirasbırakan Kuşağı / Altsoy — Çocuklar / Torunlar"
        gibi otomatik (veya cs.genLabels ile özelleştirilebilir) dikey etiketler — hiyerarşi bir bakışta.

     vd = { title, cases:[{
       law,
       genLabels?: { "-1": "Ana-Baba", "0": "Mirasbırakan", "1": "Çocuklar" },  // opsiyonel özel kuşak adları
       nodes:[{ id, label, sub?, subLabel?, reason?, gender:'f'|'m', role?:'mirasbirakan', dead?:true,
                heir?:false, reserved?:'1/4'|null,
                gen?: number,        // OTOMATİK yerleşim: kuşak no (x/y verilmezse kullanılır)
                x?, y?               // MANUEL yerleşim: verilirse aynen kullanılır, gen'i geçersiz kılar
              }],
       unions:[{ partners:[id]|[id,id], children:[id,...], type?:'marriage'|'informal'|'divorced', label?:string }]
     }] }
  */
  function familyTree(root, vd) {
    const cases = vd.cases || [];
    let ci = 0;
    let curNodes = [], curUnions = [], curNodeById = {};

    root.innerHTML =
      (vd.title ? `<div class="hv3-h">${vd.title}</div>` : '') +
      `<div class="hv3-dots" data-el="dots"></div>
       <div class="hv3-law" data-el="law" style="margin-top:0"></div>
       <div class="hv3-tree-wrap" data-el="wrap">
         <div class="hv3-tree-toolbar">
           <div class="hv3-tree-legend" data-el="legend"></div>
           <button class="hv3-tree-expand" data-el="expand">⤢ Tam ekran</button>
         </div>
         <div class="hv3-tree-frame">
           <div class="hv3-tree-ruler" data-el="ruler"></div>
           <div class="hv3-tree-stage" data-el="stage"><div class="hv3-tree-canvas" data-el="canvas"></div></div>
         </div>
         <div class="hv3-tree-panhint" data-el="panhint">✋ sürükleyerek gezin</div>
         <div class="hv3-tree-detail" data-el="detail"></div>
       </div>
       <div class="hv3-score" data-el="score"></div>
       <div class="hv3-nav"><button data-el="prev">‹ Önceki örnek</button><div class="hv3-cap" data-el="cap"></div><button data-el="next">Sonraki örnek ›</button></div>
       <div data-el="heirtable"></div>`;

    const prevBtn = root.querySelector('[data-el=prev]'), nextBtn = root.querySelector('[data-el=next]');
    const wrap = root.querySelector('[data-el=wrap]');
    const stage = root.querySelector('[data-el=stage]');
    const canvas = root.querySelector('[data-el=canvas]');
    const expandBtn = root.querySelector('[data-el=expand]');
    prevBtn.addEventListener('click', () => { if (ci > 0) { ci--; draw(); } });
    nextBtn.addEventListener('click', () => { if (ci < cases.length - 1) { ci++; draw(); } });
    expandBtn.addEventListener('click', () => toggleFullscreen());

    // Sahne içinde sürükle-gezin (pan): düğüm butonlarının üstünden başlatılmaz, boş alan/çizgi
    // üstünden başlatılır — böylece "pay? dokun" tıklamasıyla çakışmaz.
    let panX = 0, panY = 0, panning = null;
    stage.addEventListener('pointerdown', e => {
      if (e.target.closest('.hv3-tnode')) return;
      panning = { x: e.clientX, y: e.clientY, baseX: panX, baseY: panY };
      stage.setPointerCapture(e.pointerId);
      stage.classList.add('panning');
    });
    stage.addEventListener('pointermove', e => {
      if (!panning) return;
      panX = panning.baseX + (e.clientX - panning.x);
      panY = panning.baseY + (e.clientY - panning.y);
      canvas.style.transform = `translate(${panX}px, ${panY}px)`;
    });
    function endPan() { if (panning) { panning = null; stage.classList.remove('panning'); } }
    stage.addEventListener('pointerup', endPan);
    stage.addEventListener('pointerleave', endPan);
    function resetPan() { panX = 0; panY = 0; canvas.style.transform = ''; }

    let isFull = false;
    let curRowCount = 0;
    let originalParent = null, originalNextSibling = null;
    function applyStageHeight() {
      if (isFull || !curRowCount) { stage.style.height = ''; return; }
      // 28 Tem düzeltme: satır başına önceki pay (150px) düğüm+etiket+"pay? dokun" butonunun
      // gerçek yüksekliğine (~140px) yetmiyordu — en alttaki kuşak overflow:hidden tarafından
      // kırpılıyordu (bkz. kullanıcı ekran görüntüsü). Pay ve taban yükseklik artırıldı.
      stage.style.height = Math.max(300, Math.min(620, curRowCount * 175 + 120)) + 'px';
    }
    function toggleFullscreen() {
      isFull = !isFull;
      if (isFull) {
        // `wrap` bir üst elemanın (ör. .hv3 kökündeki hv3fade animasyonu transform kullanır) içinde
        // kalırsa position:fixed viewport'a değil O ATAYA göre konumlanır — ekranın bir köşesine
        // sıkışmış görünür. Bunu kesin çözmek için fullscreen'e geçerken wrap'i doğrudan <body>'ye taşı.
        originalParent = wrap.parentNode;
        originalNextSibling = wrap.nextSibling;
        document.body.appendChild(wrap);
        // wrap artık `.hv3` kapsayıcısının DIŞINDA — CSS custom property'leri (--hv3-ink vb.)
        // `.hv3` sınıfına bağlı olduğundan, wrap'e de bu sınıfı ekleyip stillerin kopmasını önle.
        wrap.classList.add('hv3', 'hv3-tree-fullscreen');
        document.body.classList.add('hv3-scroll-lock');
        const closeBtn = document.createElement('button');
        closeBtn.className = 'hv3-tree-fullscreen-close';
        closeBtn.textContent = '✕ Kapat';
        closeBtn.dataset.el = 'closeFs';
        closeBtn.addEventListener('click', () => toggleFullscreen());
        wrap.prepend(closeBtn);
        expandBtn.textContent = '⤡ Küçült';
      } else {
        wrap.classList.remove('hv3-tree-fullscreen', 'hv3');
        document.body.classList.remove('hv3-scroll-lock');
        const cb = wrap.querySelector('[data-el=closeFs]');
        if (cb) cb.remove();
        expandBtn.textContent = '⤢ Tam ekran';
        if (originalParent) {
          if (originalNextSibling) originalParent.insertBefore(wrap, originalNextSibling);
          else originalParent.appendChild(wrap);
        }
      }
      resetPan();
      applyStageHeight();
      // ResizeObserver çoğu tarayıcıda boyut değişimini zaten yakalar; desteklenmiyorsa yedek:
      setTimeout(redrawLines, 60);
    }
    document.addEventListener('keydown', escHandler);
    function escHandler(e) { if (e.key === 'Escape' && isFull) toggleFullscreen(); }

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => redrawLines());
      ro.observe(stage);
    }
    function redrawLines() {
      const old = canvas.querySelector('[data-el=linesvg]');
      if (!old || !curUnions) return;
      old.outerHTML = buildLinesSvg(stage, curUnions, curNodeById);
      // Boyut değişimi kaynaklı yeniden çizim — "çizim" animasyonu OYNAMASIN, direkt son hâline atla.
      const svg = canvas.querySelector('[data-el=linesvg]');
      if (svg) svg.querySelectorAll('line[data-draw]').forEach(el => {
        el.style.transition = 'none'; el.style.strokeDashoffset = '0';
        if (el.dataset.draw === 'informal') el.style.strokeDasharray = '7 6';
      });
    }

    draw();

    function draw() {
      root.querySelector('[data-el=dots]').innerHTML =
        cases.map((_, k) => `<i style="background:${k <= ci ? 'var(--hv3-accent)' : 'var(--hv3-line2)'}"></i>`).join('');

      const cs = cases[ci] || {};
      // Yazar verisini asla mutasyona uğratma — her çizimde klonla, otomatik yerleşim klon üzerinde çalışsın.
      const nodes = (cs.nodes || []).map(n => Object.assign({}, n));
      const unions = cs.unions || [];
      autoLayoutGenerations(nodes, unions);
      const nodeById = {}; nodes.forEach(n => { nodeById[n.id] = n; });
      curNodes = nodes; curUnions = unions; curNodeById = nodeById;

      const revealable = nodes.filter(n => n.sub !== undefined && n.sub !== null);
      let opened = 0;

      root.querySelector('[data-el=law]').innerHTML = cs.law ? `<b>Kural:</b> ${cs.law}` : '';
      root.querySelector('[data-el=cap]').textContent = `Örnek ${ci + 1} / ${cases.length}`;
      prevBtn.disabled = ci === 0; nextBtn.disabled = ci === cases.length - 1;

      const usedTypes = new Set(unions.map(u => u.type || 'marriage'));
      root.querySelector('[data-el=legend]').innerHTML = legendHTML(usedTypes);
      root.querySelector('[data-el=ruler]').innerHTML = rulerHTML(cs, nodes);

      const gensPresent = [...new Set(nodes.filter(n => n.gen !== undefined && n.gen !== null).map(n => n.gen))];
      curRowCount = gensPresent.length;
      applyStageHeight();

      const genOrder = gensPresent.slice().sort((a, b) => a - b);
      resetPan();
      canvas.innerHTML = buildLinesSvg(stage, unions, nodeById) + nodes.map(n => nodeHTML(n, genOrder)).join('');
      playLineDrawAnimation(canvas);

      // 28 Tem, 3. tur — kullanıcı geri bildirimi: gerekçe kutusu düğümün hemen altına mutlak
      // konumla basılıyordu; sahne sıkışık olduğunda (çok kuşaklı ağaçlarda satır arası boşluk az)
      // bu kutu bir ALTTAKİ kuşağın düğümlerinin ÜSTÜNE biniyor, isimler okunmaz hale geliyordu.
      // Kökten çözüm: gerekçe artık diyagramın İÇİNDE değil, sahnenin ALTINDAKİ sabit bir panelde
      // birikimli kart olarak gösteriliyor — kaç kuşak/ne kadar sık olursa olsun asla üst üste binmez.
      const detailBox = root.querySelector('[data-el=detail]');
      detailBox.innerHTML = '';
      canvas.querySelectorAll('[data-reveal]').forEach(btn => btn.addEventListener('click', () => {
        if (btn.classList.contains('open')) return;
        const n = nodeById[btn.dataset.reveal];
        btn.classList.add('open');
        btn.querySelector('[data-el=sub]').textContent = n.sub;
        if (n.reason) {
          const card = document.createElement('div');
          card.className = 'hv3-tree-detail-card';
          card.innerHTML = `<b>${n.label || ''}${n.subLabel ? ` <small>· ${n.subLabel}</small>` : ''} — ${n.sub}</b><span>${n.reason}</span>`;
          detailBox.prepend(card);
        }
        opened++; updScore();
      }));
      updScore();
      renderHeirTable(cs, nodes);

      function updScore() {
        root.querySelector('[data-el=score]').textContent = revealable.length
          ? `${opened} / ${revealable.length} pay açıldı — önce tahmin et, sonra düğüme dokun`
          : '';
      }
    }

    function legendHTML(usedTypes) {
      let html =
        `<span><i class="shape circ"></i> kadın</span>` +
        `<span><i class="shape tri"></i> erkek</span>` +
        `<span><i class="shape mb"></i> mirasbırakan</span>` +
        `<span><i class="dead"></i> önce vefat</span>` +
        `<span><i></i> evli (düz çizgi)</span>`;
      if (usedTypes.has('informal')) html += `<span><i class="informal"></i> evlilik dışı ilişki (kesikli)</span>`;
      if (usedTypes.has('divorced')) html += `<span><i class="divorced"></i> boşanmış</span>`;
      return html;
    }

    function autoGenLabel(g) {
      if (g === 0) return 'Mirasbırakan kuşağı';
      if (g < 0) return g === -1 ? 'Üstsoy' : `Üstsoy · ${-g}. kuşak`;
      if (g === 1) return 'Altsoy — çocuklar';
      if (g === 2) return 'Altsoy — torunlar';
      return `Altsoy — ${g + 1}. kuşak`;
    }

    function rulerHTML(cs, nodes) {
      const withGen = nodes.filter(n => n.gen !== undefined && n.gen !== null);
      if (!withGen.length) return '';
      const byGen = {};
      withGen.forEach(n => { (byGen[n.gen] = byGen[n.gen] || []).push(n.y); });
      const labels = cs.genLabels || {};
      return Object.keys(byGen).map(Number).sort((a, b) => a - b).map(g => {
        const ys = byGen[g];
        const y = ys.reduce((a, b) => a + b, 0) / ys.length;
        const text = labels[g] !== undefined ? labels[g] : autoGenLabel(g);
        return `<div class="hv3-tree-ruler-lbl" style="top:${y}%">${text}</div>`;
      }).join('');
    }

    function renderHeirTable(cs, nodes) {
      const box = root.querySelector('[data-el=heirtable]');
      /* Doldurma modu: paylar aşağıdaki fill_slots panelinde SORULACAKSA
         burada cevabı peşinen basma (standart v4.1 §B.0.6). */
      if (vd.hideTable || cs.hideTable) { box.innerHTML = ''; return; }
      // Tabloya girecekler: mirasbırakan hariç, açıkça heir:false denmemiş, vefat etmemiş
      // (dead:true olanlar payı halefiyetle devrettiği için kendisi mirasçı sayılmaz).
      const heirs = nodes.filter(n => n.role !== 'mirasbirakan' && n.heir !== false && !n.dead && n.sub !== undefined && n.sub !== null);
      if (!heirs.length) { box.innerHTML = ''; return; }
      box.innerHTML =
        `<div class="hv3-heir-table">
           <div class="hv3-htr hv3-hth"><div>Yasal mirasçı</div><div>Yasal miras payı</div><div>Saklı pay</div></div>
           ${heirs.map(n => `
             <div class="hv3-htr">
               <div class="hv3-hname"><i></i>${n.label || ''}${n.subLabel ? ` <span style="color:var(--hv3-faint);font-weight:500">· ${n.subLabel}</span>` : ''}</div>
               <div class="hv3-hshare">${n.sub}</div>
               <div class="hv3-hreserved${n.reserved ? '' : ' none'}">${n.reserved || '—'}</div>
             </div>`).join('')}
         </div>
         <div class="hv3-heir-caption">Saklı pay (TMK m.506): altsoy → yasal payının 1/2'si · ana-baba → yasal payının 1/4'ü · sağ kalan eş → 1./2. zümreyle birlikteyse yasal payının tamamı, tek başınaysa 3/4'ü. Kardeşlerin saklı payı yoktur.</div>`;
    }

    function nodeHTML(n, genOrder) {
      const shapeClass = n.role === 'mirasbirakan' ? 'mb' : (n.gender === 'm' ? 'tri' : 'circ');
      const canReveal = n.sub !== undefined && n.sub !== null;
      const glyph = n.role === 'mirasbirakan' ? '⊗' : '';
      const rank = (genOrder && n.gen !== undefined) ? Math.max(0, genOrder.indexOf(n.gen)) : 0;
      const delay = (rank * 0.1).toFixed(2);
      return `<div class="hv3-tnode" style="left:${n.x}%;top:${n.y}%;animation-delay:${delay}s">
        <div class="hv3-tshape ${shapeClass}${n.dead ? ' dead' : ''}">${glyph}</div>
        <div class="hv3-tname">${n.label || ''}${n.subLabel ? `<small>${n.subLabel}</small>` : ''}</div>
        ${canReveal ? `<button class="hv3-tguess" data-reveal="${n.id}"><span data-el="sub">pay? dokun</span></button>` : ''}
      </div>`;
    }
  }

  /**
   * Bir satırdaki seed node'ları (partner ilişkileri) ZİNCİR sırasına dizer: aynı union'da birlikte
   * geçen kişiler bitişik olur, bir kişinin iki partneri varsa o kişi ortada kalır (partnerA—hub—partnerB).
   * Basit bir "derece≤1 uçtan başla, komşu ekle" zincirlemesi — küçük soy ağaçları için yeterli ve sağlam.
   */
  function chainOrder(seedIds, unions) {
    const idSet = new Set(seedIds);
    const adj = {}; seedIds.forEach(id => { adj[id] = []; });
    unions.forEach(u => {
      const ps = (u.partners || []).filter(id => idSet.has(id));
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          adj[ps[i]].push(ps[j]); adj[ps[j]].push(ps[i]);
        }
      }
    });
    const visited = new Set();
    const order = [];
    function walk(start) {
      let cur = start;
      while (cur !== undefined && !visited.has(cur)) {
        visited.add(cur); order.push(cur);
        const next = (adj[cur] || []).find(n => !visited.has(n));
        cur = next;
      }
    }
    seedIds.filter(id => (adj[id] || []).length <= 1).forEach(id => { if (!visited.has(id)) walk(id); });
    seedIds.forEach(id => { if (!visited.has(id)) walk(id); });
    return order;
  }

  /**
   * Node'lara `gen` (kuşak no) verilmiş ama x/y verilmemişse konumu otomatik hesaplar.
   * x/y açıkça verilmiş node'lara DOKUNMAZ (manuel geçersiz kılma her zaman kazanır).
   * Algoritma: (1) kuşak başına satır y'si ata, (2) birliğin çocuğu olmayan "kök" node'ları
   * satırına eşit yay, (3) her union için çocukları ebeveyn orta noktasına ortalayarak yerleştir
   * (birden çok geçiş — torunlar ebeveynleri yerleşene kadar bekler), (4) satır içi çakışmaları
   * asgari boşlukla ayır ve satırı görünür alana ortala.
   */
  function autoLayoutGenerations(nodes, unions) {
    const auto = nodes.filter(n => n.x === undefined || n.y === undefined);
    if (!auto.length) return;
    auto.forEach(n => { if (n.gen === undefined || n.gen === null) n.gen = 0; });

    const gens = [...new Set(auto.map(n => n.gen))].sort((a, b) => a - b);
    // 28 Tem düzeltme: alt satır 89%'a kadar iniyordu — düğüm etiketi + "pay? dokun" butonu
    // (anchor'dan ~90-100px aşağı) sahnenin altına taşıp overflow:hidden'de kırpılıyordu.
    // Üstte/altta yeterli boşluk bırakacak şekilde aralık daraltıldı (16%–72%).
    const yFor = g => gens.length === 1 ? 44 : 16 + gens.indexOf(g) / (gens.length - 1) * 56;
    auto.forEach(n => { n.y = yFor(n.gen); });

    const nodeById = {}; nodes.forEach(n => { nodeById[n.id] = n; });
    const byGen = {};
    auto.forEach(n => { (byGen[n.gen] = byGen[n.gen] || []).push(n); });

    const isChild = new Set();
    unions.forEach(u => (u.children || []).forEach(id => isChild.add(id)));

    // 1) Bir union'da çocuk olarak geçmeyen "kök" node'ları satırlarına eşit yay.
    //    Sıralama HAM dizi sırası değil, ZİNCİR sırasıdır: aynı kişinin birden çok partneri varsa
    //    (ör. mirasbırakan + resmi eş + evlilik dışı ilişki), o kişi partnerleri arasında ORTALANIR
    //    (partnerA — hub — partnerB), aksi halde bir birliğin çizgisi üçüncü bir kişinin üstünden
    //    geçer ve altsoy bağlantısı boşlukta asılı kalırmış gibi görünürdü.
    gens.forEach(g => {
      const seeds = byGen[g].filter(n => !isChild.has(n.id) && n.x === undefined);
      const seedIds = seeds.map(n => n.id);
      const ordered = chainOrder(seedIds, unions);
      const k = ordered.length;
      ordered.forEach((id, i) => { nodeById[id].x = k === 1 ? 50 : 12 + (i / (k - 1)) * 76; });
    });

    // 2) Union'ları ebeveyn x'i belli olana kadar tekrar tekrar işleyerek çocukları ortala.
    for (let pass = 0; pass < 6; pass++) {
      let progressed = false;
      unions.forEach(u => {
        const partners = (u.partners || []).map(id => nodeById[id]).filter(Boolean);
        const children = (u.children || []).map(id => nodeById[id]).filter(Boolean);
        if (!partners.length || partners.some(p => p.x === undefined)) return;
        const midX = partners.reduce((s, p) => s + p.x, 0) / partners.length;
        const n = children.length, gap = 15;
        children.forEach((c, i) => {
          if (c.x === undefined) { c.x = midX + (i - (n - 1) / 2) * gap; progressed = true; }
        });
      });
      if (!progressed) break;
    }

    // 3) Hâlâ x'i olmayan (bağlantısız) node'lar — satırına eşit yay (yedek).
    gens.forEach(g => {
      const stragglers = byGen[g].filter(n => n.x === undefined);
      const k = stragglers.length;
      stragglers.forEach((n, i) => { n.x = k === 1 ? 50 : 20 + (i / (k - 1)) * 60; });
    });

    // 4) Satır içi çakışmaları asgari boşlukla ayır, satırı görünür alana ortala.
    gens.forEach(g => {
      const row = byGen[g].slice().sort((a, b) => a.x - b.x);
      const minGap = 13;
      for (let i = 1; i < row.length; i++) {
        if (row[i].x - row[i - 1].x < minGap) row[i].x = row[i - 1].x + minGap;
      }
      if (row.length) {
        const lo = row[0].x, hi = row[row.length - 1].x, w = hi - lo;
        // 28 Tem düzeltme: kenar boşluğu 7%'den 14%'e çıkarıldı — düğüm sabit 118px genişliğinde
        // olduğundan dar sahnelerde uçtaki düğümler (ör. mirasbırakan, tek eş) yatayda kenardan
        // taşıp kırpılıyordu; ayrıca geniş yayılım "her şey ekrana çok yakın/sığmıyor" hissi veriyordu.
        const targetLo = w <= 72 ? 14 + (72 - w) / 2 : 14;
        const shift = targetLo - lo;
        row.forEach(n => { n.x = Math.max(9, Math.min(91, n.x + shift)); });
      }
    });
  }

  /**
   * Sahnenin GERÇEK piksel boyutunu ölçüp ona göre viewBox kuran SVG — stroke-width artık yöne göre
   * bozulmaz. Çizgiler ilk anda "çizilmemiş" (dashoffset = uzunluk) yerleştirilir; ekrana konduktan
   * hemen sonra bir rAF ile dashoffset 0'a indirilerek CSS transition tetiklenir — çizgi kendini
   * çiziyormuş gibi büyür. Kesikli (informal) çizgiler çizim bitince gerçek kesikli desenine döner
   * (aksi halde "çizim" efekti ile "kesikli görünüm" birbirine karışırdı).
   */
  function buildLinesSvg(stage, unions, nodeById) {
    const rect = stage.getBoundingClientRect();
    const W = rect.width > 20 ? rect.width : 700;
    const H = rect.height > 20 ? rect.height : 480;
    const segs = [];
    unions.forEach((u, ui) => segs.push(...unionSegments(u, nodeById, W, H, ui)));
    const markup = segs.map(s => {
      if (s.text !== undefined) return `<text class="${s.cls}" x="${s.x.toFixed(1)}" y="${s.y.toFixed(1)}" text-anchor="middle">${s.text}</text>`;
      if (s.circle) return `<circle class="${s.cls || ''}" cx="${s.x1.toFixed(1)}" cy="${s.y1.toFixed(1)}" r="3.2" />`;
      const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) || 1;
      const delay = (0.05 + (s.delay || 0) * 0.09).toFixed(2);
      return `<line class="${s.cls || ''}" data-draw="${s.dash || ''}" x1="${s.x1.toFixed(1)}" y1="${s.y1.toFixed(1)}" x2="${s.x2.toFixed(1)}" y2="${s.y2.toFixed(1)}" ` +
        `style="stroke-dasharray:${len.toFixed(1)};stroke-dashoffset:${len.toFixed(1)};transition:stroke-dashoffset .5s cubic-bezier(.22,.61,.36,1) ${delay}s" />`;
    }).join('');
    return `<svg class="hv3-tree-svg" data-el="linesvg" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}">${markup}</svg>`;
  }

  /** buildLinesSvg sonrası çağrılır: "çizim" animasyonunu tetikler, bitince kesikli çizgileri gerçek desenine döndürür. */
  function playLineDrawAnimation(stage) {
    const svg = stage.querySelector('[data-el=linesvg]');
    if (!svg) return;
    const lines = [...svg.querySelectorAll('line[data-draw]')];
    const raf = (typeof requestAnimationFrame !== 'undefined') ? requestAnimationFrame : (fn => setTimeout(fn, 16));
    raf(() => raf(() => {
      lines.forEach(el => {
        el.style.strokeDashoffset = '0';
        if (el.dataset.draw === 'informal') {
          el.addEventListener('transitionend', function onEnd() {
            el.style.strokeDasharray = '7 6';
            el.style.transition = 'none';
            el.removeEventListener('transitionend', onEnd);
          }, { once: true });
        }
      });
    }));
  }

  /**
   * Bir birlik (evlilik/gayri resmi ilişki/tek ebeveyn + çocuklar) için bağlantı segmentlerini
   * GERÇEK piksel koordinatında hesaplar. type: 'marriage' (TEK düz çizgi — evli olmanın gösterimi
   * budur, ayrıca çift çizgiye gerek yoktur) · 'informal' (TEK kesikli çizgi + etiket — evlilik bağı
   * YOK demektir, ama soybağı kurulmuş çocuğun mirasçılığını EŞİT şekilde etkilemez) · 'divorced'
   * (düz çizgi + ✕ işareti — evliydiler, artık değiller). Soy bağı (ebeveyn→çocuk) çizgileri ilişki
   * türünden bağımsız hep aynı stildedir; birlik noktasında küçük bir bağlantı noktası (stemdot) var.
   */
  function unionSegments(u, nodeById, W, H, ui) {
    const px = (xPct, yPct) => [xPct / 100 * W, yPct / 100 * H];
    const partners = (u.partners || []).map(id => nodeById[id]).filter(Boolean);
    const children = (u.children || []).map(id => nodeById[id]).filter(Boolean);
    if (!partners.length) return [];
    const type = u.type || 'marriage';
    const segs = [];
    let stemXPct, stemYPct;

    if (partners.length === 2) {
      const [p1, p2] = partners;
      const [x1, y1] = px(p1.x, p1.y), [x2, y2] = px(p2.x, p2.y);
      segs.push({ x1, y1, x2, y2, cls: type === 'informal' ? 'informal' : (type === 'divorced' ? 'divorced' : ''), dash: type === 'informal' ? 'informal' : '', delay: ui });
      if (type === 'divorced') {
        segs.push({ text: '✕', x: (x1 + x2) / 2, y: (y1 + y2) / 2 + 5, cls: 'hv3-tree-divx' });
      }
      if (type === 'informal' && u.label !== false) {
        segs.push({ text: u.label || 'evlilik dışı ilişki', x: (x1 + x2) / 2, y: Math.min(y1, y2) - 10, cls: 'hv3-tree-reltag' });
      }
      stemXPct = (p1.x + p2.x) / 2; stemYPct = (p1.y + p2.y) / 2;
    } else {
      stemXPct = partners[0].x; stemYPct = partners[0].y;
    }

    if (!children.length) return segs;
    // ÇAPA KURALI: hiçbir piksel ofseti yok — çizgiler doğrudan çapadan (şekil merkezi) çapaya.
    // Şekiller çizgilerin üstünde render edildiği için çizgi şeklin altından geçer, kusursuz birleşik görünür.
    const [stemX, stemY] = px(stemXPct, stemYPct);
    const topChildYPct = Math.min(...children.map(c => c.y));
    const barYPct = stemYPct + (topChildYPct - stemYPct) * 0.55;
    const barY = barYPct / 100 * H;
    segs.push({ x1: stemX, y1: stemY, circle: true, cls: 'hv3-stemdot' });
    segs.push({ x1: stemX, y1: stemY, x2: stemX, y2: barY, cls: '', delay: ui + 0.3 });
    // 28 Tem düzeltme: yatay "bar" segmenti sadece ÇOCUKLARIN x'leri arasında çiziliyordu.
    // Tek çocuk varsa (veya tüm çocuklar bir yana kaymışsa, ör. manuel x/y'li vakalarda) ve
    // o çocuğun x'i stemX'ten farklıysa, bar sıfır uzunlukta kalıyor ve düşey iki çizgi (stem'den
    // inen ile çocuğa giden) YATAYDA BİRBİRİNE BAĞLANMIYORDU — kopuk/kaymış çizgi görünümü.
    // stemX'i de bar aralığına dahil ederek her durumda T-bağlantısı garanti ediliyor.
    const xsPx = children.map(c => c.x / 100 * W).concat([stemX]);
    segs.push({ x1: Math.min(...xsPx), y1: barY, x2: Math.max(...xsPx), y2: barY, cls: '', delay: ui + 0.5 });
    children.forEach(c => {
      const [cx, cy] = px(c.x, c.y);
      segs.push({ x1: cx, y1: barY, x2: cx, y2: cy, cls: '', delay: ui + 0.7 });
    });
    return segs;
  }

  /* ---------- 2c) CALCULATOR (genel) ----------
     Sabit iki hesaba gömülü kalmasın: veri güdümlü formül motoru.
     vd = { calc:'generic', title, inputs:[{id,label,law,value,step,min,max,unit}],
            outputs:[{label, expr, unit, note}], law, trap }
     expr: girdilerin id'lerini kullanan aritmetik ifade — ör. "ucret * yil * 0.30"
  */
  function calcGeneric(root, vd) {
    const inputs = vd.inputs || [];
    const outputs = vd.outputs || [];

    root.innerHTML =
      (vd.title ? `<div class="hv3-h">${vd.title}</div>` : '') +
      inputs.map(f => `<div class="hv3-row">
          <div class="hv3-lbl">${f.label || f.id}${f.law ? `<small>${f.law}</small>` : ''}</div>
          <input type="number" data-in="${f.id}" value="${f.value ?? 0}"
            ${f.min !== undefined ? `min="${f.min}"` : 'min="0"'}
            ${f.max !== undefined ? `max="${f.max}"` : ''}
            step="${f.step ?? 1}">
        </div>`).join('') +
      `<div class="hv3-calc" data-el="out"></div>
       ${vd.law ? `<div class="hv3-law">${vd.law}</div>` : ''}
       ${vd.trap ? `<div class="hv3-trap"><b>Sınav tuzağı:</b> ${vd.trap}</div>` : ''}`;

    const fields = [...root.querySelectorAll('[data-in]')];
    fields.forEach(el => el.addEventListener('input', calc));
    calc();

    function calc() {
      const scope = {};
      fields.forEach(el => { scope[el.dataset.in] = +el.value || 0; });
      root.querySelector('[data-el=out]').innerHTML = outputs.map(o => {
        let v;
        try {
          v = evalExpr(o.expr, scope);
        } catch (e) {
          v = NaN;
        }
        const shown = Number.isFinite(v)
          ? (o.unit === '₺' ? money(v) : v.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + (o.unit ? ' ' + o.unit : ''))
          : '—';
        return `<div class="hv3-cell">
          <div class="hv3-cn">${o.label || ''}</div>
          <div class="hv3-cf" style="font-size:21px">${shown}</div>
          ${o.note ? `<div class="hv3-cm">${o.note}</div>` : ''}
        </div>`;
      }).join('');
    }
  }

  /**
   * Güvenli aritmetik değerlendirici. eval/new Function KULLANMAZ:
   * içerik verisi ileride dış kaynaktan gelebilir, kod çalıştırma yüzeyi açmıyoruz.
   * Desteklenen: + - * / ( ) sayılar, değişken adları, min(), max()
   */
  function evalExpr(expr, scope) {
    const src = String(expr || '');
    const tokens = src.match(/[A-Za-z_]\w*|\d+(?:\.\d+)?|[()+\-*/,]/g) || [];
    let p = 0;
    const peek = () => tokens[p];
    const eat = t => { if (tokens[p] !== t) throw new Error('beklenen ' + t); p++; };

    function parseExpr() {
      let v = parseTerm();
      while (peek() === '+' || peek() === '-') { const op = tokens[p++]; const r = parseTerm(); v = op === '+' ? v + r : v - r; }
      return v;
    }
    function parseTerm() {
      let v = parseUnary();
      while (peek() === '*' || peek() === '/') { const op = tokens[p++]; const r = parseUnary(); v = op === '*' ? v * r : (r === 0 ? NaN : v / r); }
      return v;
    }
    function parseUnary() {
      if (peek() === '-') { p++; return -parseUnary(); }
      if (peek() === '+') { p++; return parseUnary(); }
      return parseAtom();
    }
    function parseAtom() {
      const t = peek();
      if (t === '(') { p++; const v = parseExpr(); eat(')'); return v; }
      if (/^\d/.test(t)) { p++; return parseFloat(t); }
      if (/^[A-Za-z_]/.test(t)) {
        p++;
        if (peek() === '(') { // min(a,b) / max(a,b)
          p++;
          const args = [parseExpr()];
          while (peek() === ',') { p++; args.push(parseExpr()); }
          eat(')');
          if (t === 'min') return Math.min(...args);
          if (t === 'max') return Math.max(...args);
          if (t === 'round') return Math.round(args[0]);
          throw new Error('bilinmeyen fonksiyon ' + t);
        }
        if (!(t in scope)) throw new Error('bilinmeyen değişken ' + t);
        return scope[t];
      }
      throw new Error('beklenmeyen belirteç ' + t);
    }
    const val = parseExpr();
    if (p !== tokens.length) throw new Error('artık belirteç');
    return val;
  }

  /* ---------- 10) FILL_SLOTS — doldurma kalıbı ----------
     Kullanıcının çıtası (28 Tem): "soy ağacı ve tablo DOLDURMA güzel pratiklik
     sağlıyor". Kilit kelime doldurma — göstermek değil. Bu kalıp bir tabloyu
     boş hücrelerle basar; kullanıcı hücreye dokunup havuzdan değer seçer,
     sistem hücre hücre denetler ve YANLIŞ OLANIN gerekçesini açar.

     Aynı motor şunları da karşılar (KONU_YAZIM_TALIMATI §3.2):
       · miras pay doldurma      rows = mirasçılar,  pool = kesirler
       · senedi doldur           rows = zorunlu unsurlar
       · rol ata (iştirak)       rows = kişiler,     pool = roller

     Veri sözleşmesi:
       { title, hint, headers:[], pool:['1/4',...], caption,
         rows:[ { label, sub, slots:[ {answer, why, pool?} ] } ] }
     Slot kendi `pool`unu verirse onu, vermezse üstteki ortak `pool`u kullanır. */
  function fillSlots(root, vd) {
    const rows = vd.rows || [], headers = vd.headers || [];
    const state = {};                 // "r-s" -> seçilen değer
    let active = null;                // o an doldurulan hücre

    const total = rows.reduce((n, r) => n + (r.slots || []).length, 0);

    root.innerHTML =
      (vd.title ? `<div class="hv3-h">${vd.title}</div>` : '') +
      `<div class="hv3-hint">${vd.hint || 'Boş hücreye dokun, sonra doğru değeri seç.'}</div>
       <div class="hv3-fs" data-el="grid"></div>
       <div class="hv3-fspool" data-el="pool" style="display:none"></div>
       <div class="hv3-askfb" data-el="fb" style="display:none"></div>
       <div class="hv3-score" data-el="score"></div>` +
      (vd.caption ? `<div class="hv3-heir-caption">${vd.caption}</div>` : '');

    const gridEl = root.querySelector('[data-el=grid]');
    const poolEl = root.querySelector('[data-el=pool]');
    const fbEl = root.querySelector('[data-el=fb]');

    drawGrid();
    updScore();

    function drawGrid() {
      const cols = 1 + (rows[0] ? (rows[0].slots || []).length : 1);
      gridEl.style.setProperty('--fs-cols', cols);
      gridEl.innerHTML =
        (headers.length ? `<div class="hv3-fsr hv3-fsh">${headers.map(h => `<div>${h}</div>`).join('')}</div>` : '') +
        rows.map((r, ri) => `
          <div class="hv3-fsr">
            <div class="hv3-fsname">${r.label || ''}${r.sub ? ` <span style="color:var(--hv3-faint);font-weight:500">· ${r.sub}</span>` : ''}</div>
            ${(r.slots || []).map((s, si) => {
              const k = ri + '-' + si, picked = state[k];
              if (picked === undefined) return `<button class="hv3-fscell" data-k="${k}" type="button">dokun…</button>`;
              const okc = picked === s.answer;
              return `<button class="hv3-fscell ${okc ? 'ok' : 'no'}" data-k="${k}" type="button" disabled>${okc ? '✓ ' : '✗ '}${picked}${okc ? '' : ` <span style="opacity:.75">→ ${s.answer}</span>`}</button>`;
            }).join('')}
          </div>`).join('');

      gridEl.querySelectorAll('.hv3-fscell:not([disabled])').forEach(b => {
        b.addEventListener('click', () => openPool(b.dataset.k));
      });
    }

    function openPool(k) {
      active = k;
      const [ri, si] = k.split('-').map(Number);
      const slot = (rows[ri].slots || [])[si] || {};
      const opts = slot.pool || vd.pool || [];
      gridEl.querySelectorAll('.hv3-fscell').forEach(c => c.classList.toggle('active', c.dataset.k === k));
      poolEl.style.display = '';
      poolEl.innerHTML =
        `<div class="hv3-fspoolq">${slot.q || (rows[ri].label || '') + ' — hangisi?'}</div>` +
        `<div class="hv3-fspoolc" data-el="chips"></div>`;
      const chips = poolEl.querySelector('[data-el=chips]');
      opts.forEach(v => {
        const b = document.createElement('button');
        b.className = 'hv3-fschip'; b.type = 'button'; b.textContent = v;
        b.addEventListener('click', () => pick(k, v));
        chips.appendChild(b);
      });
    }

    function pick(k, v) {
      if (state[k] !== undefined) return;
      state[k] = v;
      const [ri, si] = k.split('-').map(Number);
      const slot = (rows[ri].slots || [])[si] || {};
      const okc = v === slot.answer;
      drawGrid();
      poolEl.style.display = 'none'; poolEl.innerHTML = '';
      active = null;
      fbEl.style.display = '';
      fbEl.className = 'hv3-askfb ' + (okc ? 'ok' : 'no');
      fbEl.innerHTML = `<b>${okc ? '✓ Doğru' : '✗ Değil'}</b> — ${slot.why || (okc ? 'Kural bu.' : 'Doğrusu: ' + slot.answer)}`;
      updScore();
    }

    function updScore() {
      const done = Object.keys(state).length;
      const ok = Object.entries(state).filter(([k, v]) => {
        const [ri, si] = k.split('-').map(Number);
        return v === (rows[ri].slots || [])[si].answer;
      }).length;
      root.querySelector('[data-el=score]').textContent =
        `Doğru ${ok} · dolduruldu ${done}/${total}` +
        (done === total ? (ok === total ? ' — tablo eksiksiz 🎯' : ' — yanlışların gerekçesini oku') : '');
    }
  }

  /* ---------- 11) PREDICT_THEN_EXPLORE — tahmin turu + simülatör ----------
     `decision_sim` ve `calculator` toggle çevirdikçe sonucu CANLI hesaplıyor;
     ortada taahhüt anı yok, "yanıldın" anı yok. Bu keşiftir, geri çağırma
     değildir (standart v4.1 §B.0.6). Bu sarmalayıcı, simülatörün ÖNÜNE somut
     bir vaka + tahmin sorusu koyar; kullanıcı taahhüt edip gerekçesini
     gördükten SONRA simülatör açılır ve serbestçe oynanır.

     Veri sözleşmesi:
       { predict:{ q, opts:[{t, ok, why}] }, inner:'decision_sim'|'calculator',
         ...ilgili kalıbın kendi alanları }  */
  function predictThenExplore(root, vd) {
    const p = vd.predict || {};
    root.innerHTML =
      (vd.title ? `<div class="hv3-h">${vd.title}</div>` : '') +
      `<div class="hv3-ask" data-el="ask"></div>
       <div data-el="inner" style="display:none"></div>`;
    const askEl = root.querySelector('[data-el=ask]');
    const innerEl = root.querySelector('[data-el=inner]');

    if (!p.opts || !p.opts.length) { reveal(); return; }

    askEl.innerHTML =
      `<div class="hv3-askq">${p.q || ''}</div>
       <div class="hv3-askopts" data-el="opts"></div>
       <div class="hv3-askfb" data-el="fb" style="display:none"></div>`;
    const optsEl = askEl.querySelector('[data-el=opts]');
    p.opts.forEach((o, oi) => {
      const b = document.createElement('button');
      b.className = 'hv3-asko'; b.type = 'button'; b.innerHTML = o.t;
      b.addEventListener('click', () => commit(oi));
      optsEl.appendChild(b);
    });

    function commit(oi) {
      const chosen = p.opts[oi] || {};
      optsEl.querySelectorAll('.hv3-asko').forEach((b, k) => {
        b.disabled = true;
        if (p.opts[k].ok) b.classList.add('ok');
        else if (k === oi) b.classList.add('no');
        if (k === oi) b.classList.add('picked');
      });
      const fb = askEl.querySelector('[data-el=fb]');
      fb.style.display = '';
      fb.className = 'hv3-askfb ' + (chosen.ok ? 'ok' : 'no');
      fb.innerHTML = `<b>${chosen.ok ? '✓ Doğru' : '✗ Değil'}</b> — ${chosen.why || ''}` +
        `<div style="margin-top:7px;font-size:12.5px;opacity:.85">Simülatör açıldı — şartları değiştirip başka kombinasyonları da dene.</div>`;
      reveal();
    }

    function reveal() {
      innerEl.style.display = '';
      const kind = vd.inner || 'decision_sim';
      const fn = kind === 'calculator'
        ? ((r, d) => (d.calc === 'mal_rejimi' ? calcMalRejimi(r, d)
          : (d.inputs && d.outputs) ? calcGeneric(r, d) : calcMirasZumre(r, d)))
        : RENDERERS[kind];
      if (typeof fn === 'function') fn(innerEl, vd);
    }
  }

  /* ---------- DAĞITICI ---------- */

  const RENDERERS = {
    fill_slots: fillSlots,
    predict_then_explore: predictThenExplore,
    decision_sim: decisionSim,
    scene_story: sceneStory,
    scene_simulator: sceneStory,          // eski ad, aynı motor
    drag_classify: dragClassify,
    time_slider: timeSlider,
    guess_table: guessTable,
    step_reveal: stepReveal,
    interactive_hierarchy: interactiveHierarchy,
    family_tree: familyTree,
    calculator: (root, vd) => {
      if (vd.calc === 'mal_rejimi') return calcMalRejimi(root, vd);
      if (vd.calc === 'miras_zumre' || vd.heirs || vd.zumre) return calcMirasZumre(root, vd);
      if (vd.inputs && vd.outputs) return calcGeneric(root, vd);
      return calcMirasZumre(root, vd); // geriye dönük uyum
    }
  };

  /** Bir görsel tipi gerçekten çizilebiliyor mu? data.js bunu sorar. */
  function supports(kind) {
    return Object.prototype.hasOwnProperty.call(RENDERERS, kind);
  }

  function render(container, uid, vd, topic) {
    injectCss();
    const kind = topic && topic.visualType;
    const fn = RENDERERS[kind];
    if (!fn) {
      // Sessizce boş kutu BASMA — hangi tipin eksik olduğunu söyle.
      throw new Error(`HMGSV3: '${kind}' tipi için çizici yok`);
    }
    container.innerHTML = '<div class="hv3"></div>';
    fn(container.querySelector('.hv3'), vd || {});
  }

  return { types: Object.keys(RENDERERS), supports, render };
})();
