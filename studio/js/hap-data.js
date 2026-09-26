/* ==========================================================================
   hap-data.js : Sınav öncesi okuma kartları
   Dört sınavın (460 soru) en çok sorduğu konular, sınav sırasıyla. Her kart
   o konunun sorularda gerçekten sınanan kurallarını ve kurulan tuzağı taşır.
   Doğrulama: şüpheli her kural ilgili sorunun metni ve cevap anahtarıyla
   karşılaştırıldı (26 Eylül 2026). Sınavın kabul ettiği cevap ile eski kaynak
   çeliştiğinde sınavın cevabı yazıldı ve karta not düşüldü.

   Alanlar
     id : kalıcı kimlik (okundu işareti buna bağlı)
     d  : Notlar ders kimliği (notlar-data.js)
     k  : konu
     f  : sınavdaki yeri (kaç soru, kaç sınavda)
     m  : kurallar; **kalın** kısım ezberlenecek çekirdek
     t  : sınavın kurduğu tuzak (isteğe bağlı)

   © 2026 Yusuf GÜNAY, Tüm Hakları Saklıdır.
   ========================================================================== */

export const HAP = [

  /* ---------------- ANAYASA HUKUKU · 1–6 ---------------- */
  {
    id: 'ay-yeter', d: 'anayasa', k: 'TBMM yeter sayıları', f: '5 soru · her sınavda',
    m: [
      'Toplantı yeter sayısı üye tamsayısının üçte biri: **200**.',
      'Karar yeter sayısı katılanların salt çoğunluğu; ama **151**\'den (tamsayının dörtte birinin bir fazlası) az olamaz.',
      'Cumhurbaşkanının geri gönderdiği kanunu **aynen** kabul: **301** (salt çoğunluk).',
      'Anayasa değişikliği: teklif **200**, kabul **360** gizli oy. 360–399 arası CB halkoyuna sunar; **400** ve üstünde CB isterse halkoyuna sunar.',
      'Seçimlerin yenilenmesine TBMM kararı: **360**.',
    ],
    t: 'Dört şık toplantı ve karar yeter sayısının kombinasyonu olarak kuruluyor ("ikisi de sağlandı", "toplantı var karar yok"...). Önce toplantıyı, sonra kararı ayrı ayrı kontrol et.',
  },
  {
    id: 'ay-sorusturma', d: 'anayasa', k: 'Meclis soruşturması ve Yüce Divan', f: '2 soru',
    m: [
      'Önerge: üye tamsayısının salt çoğunluğu, **301**.',
      'Soruşturma açılması: **360**, gizli oy (beşte üç).',
      'Komisyon **15 kişi**, partilerin oranında kurayla; **2 ay** + **1 ay** kesin ek süre.',
      'Yüce Divan\'a sevk: **400**, gizli oy (üçte iki).',
      'Yüce Divan yargılaması **3 ay**, bitmezse **3 ay** ek süre.',
      'Yüce Divan\'a sevk edilen CB seçim kararı alamaz; bakan düşer.',
    ],
    t: '360 ile 400 aynı soruda yan yana durur: açma 360, sevk 400.',
  },
  {
    id: 'ay-secim', d: 'anayasa', k: 'Seçim, ara seçim, demokrasi araçları', f: '4 soru · her sınavda',
    m: [
      'Ara seçim her dönem **bir kez**; genel seçimden **30 ay** geçmeden yapılmaz; genel seçime **1 yıl** kala yapılmaz.',
      'Boşalan üyelik tamsayının **%5**\'ine ulaşırsa **3 ay** içinde ara seçime karar verilir.',
      'Bir ilin **hiç milletvekili kalmazsa**: boşalmadan **90 gün** sonraki ilk pazar ara seçim.',
      'Seçimler yalnız **savaş** sebebiyle **1 yıl** ertelenebilir.',
      'Yarı doğrudan araçlar: **halk teşebbüsü** (imza + meclis görüşmek zorunda), **halk vetosu**, **temsilcilerin azli** (imzayla milletvekillerini görevden alma), referandum.',
    ],
    t: 'Varsayımsal "A Devleti" kurguları geliyor: tarif hangi araca uyuyor, onu bul.',
  },
  {
    id: 'ay-mgk-parti', d: 'anayasa', k: 'MGK, dokunulmazlık, parti grupları', f: '5 soru',
    m: [
      'MGK: CB başkanlığında CB yardımcıları, **Adalet, Millî Savunma, İçişleri, Dışişleri** bakanları (4 bakan), Genelkurmay Başkanı, Kara, Deniz, Hava komutanları. Gündeme göre ilgili bakan çağrılabilir. Kararları tavsiye niteliğinde.',
      'Parti grupları dokunulmazlığın kaldırılması ve üyeliğin düşmesi hakkında **görüşme yapamaz, karar alamaz**.',
      'Dokunulmazlık kaldırma veya üyelik düşme kararına karşı **1 hafta** içinde AYM\'ye; AYM **15 gün** içinde karar verir.',
      'Parti grubu en az **20** milletvekiliyle kurulur.',
      'CB adayı: grubu olan partiler, son seçimde **%5** oy alan partiler (tek başına veya birlikte) ya da **100.000** seçmen.',
    ],
  },
  {
    id: 'ay-cb-norm', d: 'anayasa', k: 'CB ve kanunlar, somut norm denetimi', f: '3 soru',
    m: [
      'CB kanunu **15 gün** içinde yayımlar ya da geri gönderir. **Bütçe kanunu** geri gönderilemez.',
      'TBMM aynen kabul ederse (301) CB yayımlar; değiştirirse CB yeniden geri gönderebilir.',
      'CBK: temel haklar, kişi hakları ve siyasi haklar düzenlenemez. Kanunla düzenlenen konuda CBK çıkarılamaz; çatışmada **kanun** uygulanır.',
      'Somut norm: mahkeme itirazı ciddi bulursa AYM\'ye gönderir; AYM **5 ay** içinde karar verir, vermezse mahkeme yürürlükteki hükme göre davayı bitirir.',
      'AYM esas hakkında karar verdikten sonra aynı hükme **10 yıl** somut norm itirazı yapılamaz.',
    ],
    t: 'Olay: "başvurudan 4 ay geçti". Cevap: 1 ay daha bekle, sonra yürürlükteki hükme göre karar ver.',
  },

  /* ---------------- ANAYASA YARGISI · 7–9 ---------------- */
  {
    id: 'aym-temel', d: 'aymyargi', k: 'AYM: yapı, iptal davası, karar', f: '4 soru',
    m: [
      '**15 üye**, **12 yıl**, bir kez seçilir. TBMM 3 (2\'si Sayıştay, 1\'i baro adaylarından), CB 12 üye seçer.',
      'Baro kontenjanı: baro başkanlarının gösterdiği adaylardan en çok oy alan **3** aday içinden **TBMM** seçer.',
      'İptal davası: yayımdan **60 gün**. Anayasa değişikliğinde yalnız şekil (teklif, oylama çoğunluğu, ivedilikle görüşme yasağı), **10 gün**.',
      'Genel Kurul **salt çoğunlukla** karar verir; Anayasa değişikliğinin iptali ve parti kapatma üye tamsayısının **üçte ikisiyle**. Üyeler **çekimser oy kullanamaz**.',
      'Parti kapatma davasını **Yargıtay Cumhuriyet Başsavcısı** açar.',
    ],
  },
  {
    id: 'aym-bireysel', d: 'aymyargi', k: 'Bireysel başvuru', f: '2 soru',
    m: [
      'Anayasa ve AİHS\'in **ortak alanındaki** haklar, kamu gücüyle ihlal.',
      'Olağan kanun yolları tüketildikten sonra **30 gün**; haklı mazerette mazeretin kalkmasından **15 gün**.',
      '**Kamu tüzel kişileri** başvuramaz; özel hukuk tüzel kişileri yalnız kendi tüzel kişiliğine ait haklar için başvurur.',
      'Yabancılar yalnız Türk vatandaşlarına tanınan haklar için başvuramaz.',
      'Devlet sırrı içeren tanıklık: Başkan, **zabıt kâtibi olmadan** dinler; yalnız davanın esasına etkili kısmı tutanağa geçer.',
    ],
    t: '"Kural olarak yapılamaz" diye kurulan şık iki sınavda da ters çevrilmiş hükümdü (ör. bilgi-belge vermeyenler hakkında doğrudan soruşturma yapılabilir).',
  },

  /* ---------------- İDARE HUKUKU · 10–15 ---------------- */
  {
    id: 'id-memur', d: 'idare', k: 'Devlet memurları (657)', f: '7 soru · her sınavda',
    m: [
      'Disiplin cezaları: **uyarma, kınama, aylıktan kesme, kademe ilerlemesinin durdurulması, Devlet memurluğundan çıkarma**.',
      '**Görevden uzaklaştırma disiplin cezası değildir**; ihtiyati tedbirdir.',
      'Disiplin zamanaşımı: öğrenmeden itibaren ilk dört ceza için **1 ay**, çıkarma için **6 ay** içinde soruşturmaya başlanmalı; her hâlde fiilden **2 yıl** içinde ceza verilmeli.',
      'Avukatlık stajını tamamlayana **1 kademe** ilerlemesi verilir.',
      'Memurların görev suçlarında soruşturma **4483** sayılı Kanun\'a göre izne bağlı.',
    ],
    t: 'Beş şıkta dört disiplin cezası + görevden uzaklaştırma gelir; "hangisi disiplin cezası değildir" sorusunun cevabı genelde o.',
  },
  {
    id: 'id-yetki', d: 'idare', k: 'Yetki devri, vesayet, hiyerarşi', f: '2 soru · iki sınavda aynı beşli',
    m: [
      '**Yetki devri**: kanunun izniyle, yazılı; devreden artık o yetkiyi kullanamaz.',
      '**İmza devri**: yetki devredende kalır, yalnız imza atan değişir.',
      '**Hiyerarşi**: aynı tüzel kişilik içinde; üst, astın işlemini hem hukukilik hem yerindelik yönünden resen denetler.',
      '**İdari vesayet**: farklı tüzel kişiler arasında (merkez ile yerinden yönetim), kanunla sınırlı, istisnai.',
      '**Yetki saptırması**: kamu yararı dışında bir amaç (maksat unsuru). **Fiilî memur**: usulsüz atanmış ama işlemleri geçerli sayılan görevli. **Yetkide paralellik**: işlemi yapan makam geri alır, değiştirir.',
    ],
    t: 'Kök bir mahkeme kararından alıntı; cevap alıntının içinde saklı iki kelimelik kavram adıdır.',
  },
  {
    id: 'id-kdk-bilgi', d: 'idare', k: 'KDK, bilgi edinme, kamu hizmeti', f: '5 soru',
    m: [
      'KDK\'ya, idari başvuru yolları tükendikten sonra **6 ay** içinde şikâyet.',
      '**Dava açma süresi içinde KDK\'ya başvuru, işlemeye başlamış süreyi durdurur**; KDK kararının tebliğiyle kalan süre işler.',
      'KDK görev dışı: yasama, yargı, CB\'nin kendiliğinden yaptığı işlemler, TSK\'nın salt askerî faaliyetleri.',
      'Bilgi edinme: cevap **15 iş günü** (başka birimden görüş gerekirse **30 iş günü**). Ret kararına **15 gün** içinde Kurul\'a itiraz; Kurul **30 iş günü** içinde karar verir.',
      'Devlet mallarının haczedilememesi: kamu hizmetinin **süreklilik** ilkesi.',
    ],
    t: 'KDK başvurusunun süreyi durdurması iki sınavda ters yönden soruldu: bir sınavda doğru şık, ötekinde yanlış şık.',
  },
  {
    id: 'id-kamulastirma', d: 'idare', k: 'Kamulaştırma', f: '3 soru',
    m: [
      'Kamu yararı kararı → satın alma usulüyle uzlaşma → olmazsa idare **asliye hukuk**tan bedel tespiti ve tescil ister.',
      'Kamulaştırma işleminin **iptali**: idari yargı. **Maddi hataların düzeltimi** ve bedel uyuşmazlığı: **adli yargı**.',
      '**İdareler arası** kamulaştırmada (bir kamu kurumunun taşınmazını başka bir idare alıyorsa) anlaşılamazsa uyuşmazlığı **Danıştay kesin** olarak karara bağlar.',
      'Paydaşlar kamulaştırmaya karşı **tek başına** dava açabilir; birlikte dava açma zorunluluğu yok.',
    ],
    t: 'Yargı yolu kaydırması: Danıştay, BİM, idare mahkemesi, asliye hukuk, Yargıtay aynı beşlide.',
  },

  /* ---------------- İYUK · 16–18 ---------------- */
  {
    id: 'iyuk-yd', d: 'iyuk', k: 'Yürütmenin durdurulması', f: '3 soru',
    m: [
      'İki şart **birlikte**: telafisi güç veya imkânsız zarar + idari işlemin **açıkça** hukuka aykırılığı.',
      'Kural olarak savunma alındıktan sonra karar verilir; ama istem **savunma alınmadan reddedilebilir**.',
      '**Disiplin cezalarında da** YD istenebilir.',
      'YD kararlarına **7 gün** içinde bir kez itiraz; itiraz mercii de 7 gün içinde karar verir.',
      'Danıştay temyiz incelemesinde verdiği YD kararlarına itiraz edilemez.',
    ],
    t: 'Bloğun neredeyse yarısı "yanlıştır" kökü. Bu dört kuralın ters çevrilmiş hâlleri doğru cevap oldu.',
  },
  {
    id: 'iyuk-durusma', d: 'iyuk', k: 'Duruşma ve ilk inceleme', f: '4 soru',
    m: [
      'Duruşma davetiyesi en az **30 gün** önce; taraflara **ikişer** defa söz verilir.',
      'Taraflardan yalnız biri gelse de **duruşma yapılır**.',
      'Duruşmada **savcı yalnız Danıştay**\'da bulunur; idare ve vergi mahkemesinde yok.',
      'İlk inceleme: görev ve yetki, kesin ve yürütülmesi gerekli işlem, ehliyet, idari merci tecavüzü, süre aşımı, husumet, dilekçenin usule uygunluğu.',
      'Sonuçları: süre aşımı ve ehliyet → ret; husumet → gerçek hasma tebliğ; merci tecavüzü → merciine tevdi; usule aykırı dilekçe → dilekçenin reddi (30 gün içinde yeniden, bir kez); kesin işlem yok → **incelenmeksizin ret**.',
    ],
  },
  {
    id: 'iyuk-danistay', d: 'iyuk', k: 'Danıştay teşkilatı (2575)', f: '2 soru',
    m: [
      'Üyelerin **3/4**\'ü HSK, **1/4**\'ü CB tarafından; **12 yıl**, tek dönem.',
      'Kurullar: **Genel Kurul, İdari Dava Daireleri Kurulu, Vergi Dava Daireleri Kurulu, İçtihatları Birleştirme Kurulu, Başkanlar Kurulu, Başkanlık Kurulu**.',
      'Genel dava süresi Danıştay ve idare mahkemesinde **60 gün**, vergi mahkemesinde **30 gün**.',
      'Görevsizlik kararından sonra kesinleşmeyi izleyen günden **30 gün** içinde görevli yerde dava.',
    ],
    t: 'Teşkilat adları 2575\'te; 2577 (İYUK) sorusuna karışık konuyor.',
  },

  /* ---------------- MEDENİ HUKUK · 19–33 ---------------- */
  {
    id: 'med-bosanma', d: 'medeni', k: 'Boşanma sebepleri', f: '9 soru · her sınavda',
    m: [
      '**Zina** ve **hayata kast, pek kötü veya onur kırıcı davranış**: mutlak sebep. Öğrenmeden **6 ay**, olaydan **5 yıl**. Affeden dava açamaz.',
      '**Suç işleme, haysiyetsiz hayat**: nispi (çekilmezlik gerekir), süre yok, **her zaman** açılır.',
      '**Terk**: en az **6 ay**; ihtar **4. ay** dolunca istenir, ihtardan sonra **2 ay** beklenir.',
      '**Akıl hastalığı**: nispi; iyileşmezlik resmî sağlık kurulu raporuyla.',
      '**Anlaşmalı**: evlilik en az **1 yıl** + hâkim tarafları **bizzat** dinler + düzenlemeyi uygun bulur.',
      '**Fiilî ayrılık**: ret kararının kesinleşmesinden itibaren **1 yıl** ortak hayat kurulamamış olmalı.',
    ],
    t: '"Her zaman dava açılabilir" gibi mutlak ifadeler burada doğru olabiliyor (haysiyetsiz hayat). Mutlaklığa değil hükmün kendisine bak.',
  },
  {
    id: 'med-bosanma-sonuc', d: 'medeni', k: 'Boşanmanın sonuçları', f: '3 soru',
    m: [
      'Maddi ve manevi tazminat: **kusursuz veya daha az kusurlu** taraf ister.',
      'Yoksulluk nafakası: kusuru daha ağır olmayan, **süresiz**; ödeyenin kusurlu olması **şart değil**.',
      'Kadın evlenmeden önceki soyadını alır; menfaati varsa hâkim eski eşin soyadını taşımaya izin verebilir. Kadın evlenmeyle kazandığı kişisel durumu korur.',
      'Boşanan eşler birbirinin yasal mirasçısı olamaz; önceki ölüme bağlı tasarruflardaki haklarını kaybeder.',
      'Boşanmadan doğan dava hakları: hükmün kesinleşmesinden **1 yıl** (6 ay çeldirici).',
      'İrat nafaka: alacaklının evlenmesi veya ölümle **kendiliğinden**; fiilen evli gibi yaşama, yoksulluğun kalkması, haysiyetsiz hayat → **mahkeme kararıyla** kalkar.',
    ],
  },
  {
    id: 'med-miras-pay', d: 'medeni', k: 'Yasal miras ve saklı pay', f: '4 soru · her sınavda',
    m: [
      '1. zümre **altsoy**; altsoy varken ana, baba, kardeş mirasçı **olamaz**.',
      'Önce ölen çocuğun payı halefiyetle **onun çocuklarına eşit** bölünür.',
      'Sağ eş: altsoyla **1/4**, ana baba zümresiyle **1/2**, büyükana büyükbaba ile **3/4**, hiçbiri yoksa **tamamı**.',
      'Saklı pay: altsoy yasal payının **1/2**\'si, ana baba **1/4**\'ü; eş, altsoy veya ana baba ile birlikteyken yasal payının **tamamı**, diğer hâllerde **3/4**\'ü. Kardeşin saklı payı yok.',
      'Örnek (son sınav): eş + kız + önce ölen oğlun 2 çocuğu → eş **1/4**, kız **3/8**, torunlar ayrı ayrı **3/16**, kızın saklı payı **3/16**.',
    ],
    t: 'Saklı pay ile yasal pay yer değiştiriyor ("torunların payı ayrı ayrı 3/8" yanlış şıktı). Harf kodlu olayda soy ağacını çiz.',
  },
  {
    id: 'med-miras-islem', d: 'medeni', k: 'Mirasın reddi, vasiyetname, tenkis', f: '7 soru',
    m: [
      'Ret süresi **3 ay**: yasal mirasçı ölümü öğrenmeden, atanmış mirasçı bildirimden. **Sulh hukuk** hâkimine sözlü veya yazılı. Ölüm anında aczi açık tereke reddedilmiş sayılır.',
      'Miras ortaklığı **elbirliği**; mirasçılar tereke borçlarından **müteselsil** sorumlu.',
      'Resmî vasiyetname: memur (sulh hâkimi, noter) + **2 tanık**. El yazılı: baştan sona el yazısı + **tarih** + **imza**. Sözlü: olağanüstü durum, 2 tanık.',
      'Vasiyet ehliyeti: ayırt etme gücü + **15 yaş**. İptal davası: öğrenmeden **1 yıl**; her hâlde iyiniyetli davalıya **10 yıl**, kötüniyetliye **20 yıl**.',
      '**Tenkis önce ölüme bağlı tasarruflardan**, sonra sağlararası kazandırmalardan (yeniden eskiye).',
      'Vasiyeti yerine getirme görevlisi, bildirimden **15 gün** içinde susarsa görevi kabul etmiş sayılır.',
    ],
    t: 'Ters çevrilmiş hüküm doğru cevaptı: "tenkis önce sağlararası kazandırmalardan yapılır" yanlış.',
  },
  {
    id: 'med-dernek', d: 'medeni', k: 'Dernek', f: '4 soru · üç sınavda',
    m: [
      'En az **7** gerçek veya tüzel kişi; tüzük ve kuruluş bildirimi mülki amirliğe verilince tüzel kişilik kazanılır.',
      'Zorunlu organlar: **genel kurul, yönetim kurulu, denetim kurulu**. Genel kurul en yetkili organ.',
      'Yönetim kurulu en az **5 asıl + 5 yedek**, denetim kurulu en az **3 asıl + 3 yedek**. Tüzük daha fazlasını koyabilir (7+7 aykırı değil).',
      'Genel kurulda her üyenin **bir** oyu var ve oyunu **kendisi** kullanır; vekâletle oy yok.',
      'Federasyon en az **5 dernek**, konfederasyon en az **3 federasyon**.',
      'Kendiliğinden sona erme: amacın imkânsızlaşması, kuruluştan **6 ay** içinde ilk genel kurulun yapılmaması, yönetim kurulunun oluşturulamaması, borç ödemeden aciz.',
    ],
  },
  {
    id: 'med-ehliyet', d: 'medeni', k: 'Fiil ehliyeti, kısıtlama, gaiplik', f: '8 soru',
    m: [
      'Tam ehliyet: **ayırt etme gücü + ergin + kısıtlı olmamak**. Erginlik 18; evlenmeyle; **15 yaşını dolduran** küçük kendi isteği ve velinin rızasıyla mahkeme kararıyla ergin kılınabilir.',
      'Sınırlı ehliyetsiz (ayırt etme gücü olan küçük veya kısıtlı): yasal temsilci rızasıyla borçlanır; **karşılıksız kazanma** ve **kişiye sıkı bağlı** haklarda tek başına; haksız fiilden sorumlu.',
      'Kısıtlama sebepleri: akıl hastalığı veya zayıflığı; savurganlık, bağımlılık, kötü yaşam, kötü yönetim; **1 yıl veya daha uzun** özgürlüğü bağlayıcı ceza; kendi isteği.',
      'Gaiplik: ölüm tehlikesinde kaybolmadan en az **1 yıl** ya da son haberden en az **5 yıl** sonra istenir; ilk ilandan itibaren en az **6 ay** beklenir.',
      'Gaiplik kararı evliliği **kendiliğinden bitirmez**; ayrıca feshi istenmeli.',
      'Ad değiştirmeden zarar gören, öğrenmeden **1 yıl** içinde dava açar.',
    ],
  },
  {
    id: 'med-evlenme', d: 'medeni', k: 'Evlenme engelleri ve butlan', f: '3 soru',
    m: [
      'Olağan evlenme yaşı **17**; olağanüstü **16** + hâkim izni. 15 yaşında ergin kılınmak evlenme ehliyeti vermez.',
      'Yasak hısımlık: üstsoy altsoy, kardeşler, amca dayı hala teyze ile yeğen (**3. derece** dahil), eski eşin üstsoy ve altsoyu. **Kuzen serbest.**',
      '**Mutlak butlan**: mevcut evlilik, sürekli ayırt etme gücü yokluğu, akıl hastalığı, yasak hısımlık. Savcı resen açar, süre yok; **sona ermiş evlilikte savcı resen açamaz**.',
      '**Nispi butlan**: geçici ayırt etme gücü yokluğu, yanılma, aldatma, korkutma, yasal temsilci izninin yokluğu. **6 ay / 5 yıl**.',
      'Butlan kararına kadar evlilik geçerli evliliğin bütün sonuçlarını doğurur; çocuklar evlilik içi sayılır.',
      'Kadının **300 gün** bekleme süresine uyulmaması butlan sebebi değil.',
    ],
    t: 'Geçerli, mutlak butlan, askıda hükümsüz, yok hükmünde, nispi butlan beşlisi iki sınavda aynen geldi, cevap farklıydı.',
  },
  {
    id: 'med-tapu', d: 'medeni', k: 'Tapu sicili ve şerh', f: '3 soru · üç sınavda',
    m: [
      'Tescil **kurucu**; hüküm **yevmiye defterine** kayıtla başlar. Tescil şarta bağlanamaz.',
      'Tescilsiz kazanma (tescil açıklayıcı): **miras, cebrî icra, mahkeme kararı, işgal, kamulaştırma**; tasarruf için önce tescil gerekir.',
      'Tapuya güven: yolsuz tescile dayanıp **iyiniyetle ayni hak** kazanan korunur. **Sahte kimlik ve sahte vekâletnamede** uygulanmaz.',
      'Kişisel hakların şerhi: hak ayni olmaz, **üçüncü kişilere karşı** ileri sürülebilir. Satış vaadi ve arsa payı inşaat **5 yıl**; alım, önalım, geri alım **10 yıl**.',
      'Geçici tescil şerhi: iddia edilen ayni hakkı güvenceye alır. Plan ile fiilî durum çelişirse **plan** esas.',
    ],
  },
  {
    id: 'med-zilyetlik', d: 'medeni', k: 'Zilyetlik', f: '2 soru · aynı beşli',
    m: [
      '**Kısa elden teslim**: mal zaten alanın elinde (kiracı evi satın alır).',
      '**Hükmen teslim**: devreden malı başka bir sebeple elinde tutmaya devam eder (satılan yüzük isim yazılmak için kuyumcuda kalır).',
      '**Zilyetliğin havalesi**: mal üçüncü kişide (feri zilyet) dururken asli zilyetlik devredilir; en az üç kişi.',
      'Zilyetlik davaları: öğrenmeden **2 ay**, her hâlde **1 yıl**; üstün hak iddiası kural olarak dinlenmez.',
      'İyiniyetli zilyet zorunlu ve faydalı masrafı ister, **alıkoyabilir**; kötüniyetli yalnız zorunlu masrafı ister, alıkoyamaz.',
    ],
    t: 'Aynı beş şık iki sınavda geldi: bir sınavda havale, ötekinde hükmen teslim. Kökteki tarifi oku.',
  },
  {
    id: 'med-sinirli-ayni', d: 'medeni', k: 'Üst hakkı, intifa, rehin', f: '8 soru',
    m: [
      'Üst hakkı: en az **30 yıl** kurulursa bağımsız ve sürekli, tapuya ayrı sayfa; en çok **100 yıl**; aksi kararlaştırılmadıkça devredilir ve mirasçıya geçer. **Bağımsız bölüm üzerinde ayrıca üst hakkı kurulamaz.**',
      'İntifa: tam yararlanma, tasarruf yok; gerçek kişide ölümle, **tüzel kişide en çok 100 yıl**. Hak devredilemez, kullanımı devredilebilir. **Malik harap malı onarmakla yükümlü değil.**',
      'Oturma hakkı: yalnız gerçek kişi, devredilemez, mirasçıya geçmez.',
      'İpotek güvencesi: anapara + takip giderleri + gecikme faizi + **3 yıllık** işlemiş faiz ve işlemekte olan faiz.',
      'Taşınmaz rehninde **sabit dereceler**; taşınırda kuruluş sırası. Borç ödenmezse malın alacaklıya kalacağı anlaşması (**lex commissoria**) geçersiz.',
      'İpotekli borç senedi: kişisel + taşınmaz sorumluluğu; irat senedi: **yalnız taşınmaz**.',
    ],
    t: 'Ters çevrilmiş hükümler doğru cevap oldu: "bağımsız bölümde ayrıca üst hakkı kurulabilir" ve "malik harap intifa malını onarmakla yükümlüdür" yanlış.',
  },

  /* ---------------- BORÇLAR HUKUKU · 34–45 ---------------- */
  {
    id: 'bor-kira', d: 'borclar', k: 'Kira (konut ve çatılı iş yeri)', f: '8 soru · her sınavda',
    m: [
      'Kiracı ödemezse kiraya veren en az **30 gün** süre vererek yazılı ihtar eder; ödenmezse fesih.',
      'Özenle kullanmaya aykırılıkta da en az **30 gün** süreli ihtar.',
      'Güvence en çok **3 aylık** kira; para ise vadeli hesaba, kıymetli evrak ise bankaya, kiracı adına.',
      'Belirli süreli kira: kiracı bitimden **15 gün** önce bildirmezse aynı koşullarla **1 yıl** uzar; kiraya veren **10 yıllık** uzama bitince sebepsiz feshedebilir.',
      'İhtiyaç, yeniden inşa ve imar sebebiyle tahliye edilen yeri kiraya veren **3 yıl** eski kiracıdan başkasına kiralayamaz.',
      'Yeni malik ihtiyacı: edinmeden **1 ay** içinde bildirim, **6 ay** sonra dava. Tahliye taahhüdü: tarihten **1 ay** içinde. İki haklı ihtar: bir kira yılında 2 ihtar.',
    ],
  },
  {
    id: 'bor-zamanasimi', d: 'borclar', k: 'Zamanaşımı ve kesilmesi', f: '4 soru',
    m: [
      'Genel süre **10 yıl**; kira, faiz, ücret gibi dönemsel edimler, vekâlet ve eser (taşınmazda ağır kusur hariç) **5 yıl**.',
      'Haksız fiil ve sebepsiz zenginleşme: öğrenmeden **2 yıl**, her hâlde **10 yıl**.',
      'Taşınmaz yapıda yüklenicinin **ağır kusuru**: **20 yıl**.',
      'Kesilme: borçlunun ikrarı (kısmi ödeme, faiz, rehin, kefil gösterme) ya da alacaklının dava ve takibi. Borç **senetle ikrar** edilmiş veya hükme bağlanmışsa yeni süre **her zaman 10 yıl**.',
      '**Asıl borçluya karşı kesilince kefile karşı da kesilir; kefile karşı kesilince asıl borçluya karşı kesilmez.** Müteselsil ve bölünemeyen borçta birine karşı kesilme hepsine etkili.',
    ],
    t: 'Kefil yönü ters çevrildi: "kefile karşı kesilince asıl borçluya da kesilir" yanlış şıktı ve doğru cevaptı.',
  },
  {
    id: 'bor-irade', d: 'borclar', k: 'İrade bozuklukları ve aşırı yararlanma', f: '3 soru',
    m: [
      'Yanılma, aldatma: öğrenmeden **1 yıl**; korkutma: etkisinin kalkmasından **1 yıl**.',
      'Üçüncü kişinin aldatması: karşı taraf biliyor veya bilmesi gerekiyorsa iptal edilir.',
      'Aşırı yararlanma (gabin): açık oransızlık + zor durum, düşüncesizlik veya deneyimsizliğin sömürülmesi. Öğrenmeden **1 yıl**, her hâlde sözleşmeden **5 yıl**.',
      'Tarihli olayda süreyi **öğrenme** tarihinden başlat.',
    ],
    t: 'Beş şık beş tarih: sözleşme tarihinden başlatan için ayrı bir şık konmuştu.',
  },
  {
    id: 'bor-hukumsuzluk', d: 'borclar', k: 'Genel işlem koşulları ve geçersizlik', f: '5 soru',
    m: [
      'GİŞ: karşı tarafa bilgi verilip kabul edilmeyen koşul **yazılmamış sayılır**. Açık olmayan koşul düzenleyen aleyhine yorumlanır.',
      'Karşı taraf aleyhine **tek yanlı değişiklik** yetkisi veren kayıt **yazılmamış sayılır**; sözleşmeyi geçersiz kılmaz.',
      'Kesin hükümsüzlük: kanunun emredici hükmü, ahlak, kamu düzeni, kişilik hakları, imkânsız konu. Kısmi hükümsüzlük mümkün.',
      'Ağır kusur hâlinde sorumluluğu önceden kaldıran anlaşma **kesin olarak hükümsüz**.',
      'Geciktirici koşulda alacaklı, hakkı tehlikeye düşerse **koruma önlemi** isteyebilir.',
    ],
    t: '"Kesin olarak hükümsüzdür" ifadesi üç soruda geçti, üçünde de doğruydu. Burada ayırt edici olan yaptırımın türü.',
  },
  {
    id: 'bor-hasar-ayip', d: 'borclar', k: 'Yarar-hasar ve satışta ayıp', f: '7 soru',
    m: [
      'Taşınır satışında yarar ve hasar kural olarak **zilyetliğin devrine kadar satıcıda**.',
      'Alıcının isteğiyle başka yere gönderilirse **taşıyıcıya teslimle** alıcıya geçer. Taraflar geçiş anını kararlaştırabilir.',
      'Alıcı zilyetliği devralmada **temerrüde düşerse** hasar **alıcıya** geçer.',
      'Satıcı ayıbı **bilmese de sorumlu**. Seçimlik haklar: dönme, indirim, ücretsiz onarım, ayıpsız misliyle değişim.',
      'Ağır kusurlu satıcının sorumsuzluk anlaşması **kesin hükümsüz**. Hayvan satışında yazılı üstlenme veya ağır kusur yoksa sorumlu değil.',
    ],
    t: '"Alıcı temerrüde düşse de hasar satıcıda kalır" yanlış şıktı ve doğru cevaptı.',
  },
  {
    id: 'bor-takas-devir', d: 'borclar', k: 'Takas ve alacağın devri', f: '7 soru',
    m: [
      'Takas şartları: karşılıklılık, aynı tür edim, takas edenin alacağının **muaccel** olması, dava edilebilirlik. Beyanla olur.',
      'İki alacak **az olan miktarda**, takasa elverişli hâle geldikleri andan itibaren sona erer (tamamen değil).',
      'Takas edilemez: rıza dışı alınan veya kötüniyetle alıkonan şeyin iadesi, nafaka ve ücret gibi yaşam için zorunlu alacaklar, kamu hukuku alacakları.',
      'Alacağın devri **yazılı**; borçlunun rızası gerekmez. Devir yasağı yazılı sözleşmede yoksa iyiniyetli devralana ileri sürülemez.',
      'Borçlu devir bildiriminden önce eski alacaklıya iyiniyetle öderse borçtan kurtulur. Feri haklar devralana geçer.',
    ],
    t: 'Vade farkıyla takas olayında "iki alacak tamamen sona erer" öncülü doğru sanıldı; cevap yalnız I idi.',
  },
  {
    id: 'bor-kefalet', d: 'borclar', k: 'Kefalet, ceza koşulu, haksız fiil', f: '9 soru',
    m: [
      'Kefalet **yazılı** + azami miktar + tarih; müteselsil kefalet ise bu sıfat kefilin el yazısıyla. Eşin **yazılı rızası** gerekir (ticari işletme ve şirket yöneticisi kefaletleri ve aval hariç).',
      'Adi kefalette önce asıl borçlu; müteselsilde doğrudan kefile gidilebilir. Kefil, asıl borçlunun defilerini, borçlu vazgeçse de ileri sürer.',
      'Ceza koşulu: kural olarak ya ifa ya ceza; ifanın zamanında veya yerinde yapılmamasına ilişkinse ikisi birden. Aşırı cezayı hâkim indirir; **tacirde indirim yok**.',
      'Haksız fiilde ispat yükü zarar görende. Hâkim tazminatı zarar görenin kusuru ya da hafif kusurlu yükümlünün yoksulluğa düşecek olması hâlinde indirebilir; **kast ve ağır kusurda yoksulluk indirimi yok**.',
      'Tüketim ödüncünde süre yoksa ilk istemden itibaren **6 hafta** içinde iade.',
    ],
    t: 'Kefalet üç soruda ters yönden kuruldu: kök bir soruda, çeldirici ikisinde.',
  },

  /* ---------------- TİCARET HUKUKU · 46–57 ---------------- */
  {
    id: 'tic-kambiyo', d: 'ticaret', k: 'Poliçe, bono, çek: temel kurallar', f: '16 soru · her sınavda',
    m: [
      'Poliçe vadeleri: **görüldüğünde**, görüldükten belli süre sonra, düzenlemeden belli süre sonra, **belirli gün**. Başka vade veya birden çok vade → senet **batıl**. Vade yoksa görüldüğünde.',
      'Görüldüğünde ödemeli poliçe, düzenlemeden itibaren **1 yıl** içinde ödeme için ibraz edilir.',
      '**Yalnız çek hamiline** düzenlenebilir; poliçe ve bono hamiline düzenlenemez.',
      'Çek ibraz: düzenleme ve ödeme yeri aynıysa **10 gün**, ayrıysa (aynı kıtada) **1 ay**, farklı kıtalarda **3 ay**.',
      'Zamanaşımı: hamilin kabul edene ve bono düzenleyene **3 yıl**; cirantalara **1 yıl**; cirantaların birbirine **6 ay**; çekte **6 ay**.',
    ],
  },
  {
    id: 'tic-ciro', d: 'ticaret', k: 'Ciro, aval, ihbar', f: '7 soru',
    m: [
      'Ciro kayıtsız şartsız; şart **yazılmamış sayılır**. **Kısmi ciro batıl.**',
      'Tahsil cirosu yalnız temsil yetkisi verir; ciranta kural olarak kabul ve ödemeden sorumlu; yeni ciroyu yasaklayabilir.',
      'Protestodan veya protesto süresi geçtikten sonra yapılan ciro **alacağın devri** etkisi doğurur.',
      'Aval kimin için verildiği yazılmazsa **düzenleyen** için verilmiş sayılır; aval veren, lehine aval verilen gibi sorumlu.',
      'İhbar: hamil protestoyu izleyen **4 iş günü** içinde kendi cirantasına ve düzenleyene; her ciranta **2 iş günü** içinde kendi cirantasına. Araya giren **2 iş günü** içinde bildirir.',
      '**Süresinde ihbar etmeyen hakkını kaybetmez**; ihmalinden doğan zarardan senet bedelini aşmamak üzere sorumlu.',
    ],
    t: 'İki ters hüküm doğru cevap oldu: "kısmi ciro mümkündür" ve "süresinde ihbar etmeyen başvurma hakkını kaybeder".',
  },
  {
    id: 'tic-as', d: 'ticaret', k: 'Anonim şirket', f: '7 soru',
    m: [
      'Genel kurulun devredilemez yetkileri: esas sözleşme değişikliği, YK üyelerini ve denetçiyi seçme ve azil, finansal tablolar ve kâr dağıtımı, önemli miktarda varlık satışı, fesih.',
      'Esas sözleşme değişikliği kural olarak sermayenin yarısıyla toplanır, mevcut oyların çoğunluğuyla karar.',
      '**İşletme konusunun tamamen değiştirilmesi**, imtiyazlı pay, nama yazılı pay devrinin sınırlanması: sermayenin **%75**\'i.',
      'Pay sahiplerine **ek ödeme** veya ikincil yükümlülük: **oybirliği**.',
      'Azlık (sermayenin **1/10**\'u, halka açıkta 1/20): genel kurulu çağırma, gündeme madde, finansal tablo müzakeresini **1 ay** erteletme.',
      'Özel denetim reddedilirse azlık **3 ay** içinde **asliye ticaret mahkemesi**nden ister.',
    ],
  },
  {
    id: 'tic-ltd-tacir', d: 'ticaret', k: 'Limited şirket, tacir, şube, acente', f: '12 soru',
    m: [
      'Limited: en az **1**, en çok **50** ortak; **kanunen yasak olmayan her ekonomik amaçla** kurulur (yalnız ticari işletme değil).',
      'Limitedde önemli kararlar: temsil edilen oyların **2/3**\'ü + oy hakkı olan esas sermayenin **salt çoğunluğu**. Pay devri yazılı, imzalar noter onaylı, genel kurul onayı.',
      'Şube ticaret siciline tescil edilir; **şubeye ayrı sermaye tahsisi zorunlu değil**.',
      'Acente: belirli yerde sürekli, bağımsız tacir. Belirsiz süreli sözleşmede **3 ay** önceden fesih bildirimi. Denkleştirme tazminatı son **5 yılın** ortalama yıllık komisyonunu aşamaz, sona ermeden **1 yıl** içinde istenir.',
      'Komşu tipler: ticari temsilci (işletmeyi yönetme yetkisi), ticari vekil (belli işler), simsar (arızi aracılık), tek satıcı.',
      'Haksız rekabet davası: öğrenmeden **1 yıl**, her hâlde **3 yıl**.',
    ],
    t: '"Yalnızca" kelimesiyle mutlaklaştırılmış şık (limited şirket yalnızca ticari işletme için) yanlıştı.',
  },

  /* ---------------- HMK · 58–69 ---------------- */
  {
    id: 'hmk-sure', d: 'hmk', k: 'HMK süreleri', f: '7 soru · her sınavda',
    m: [
      'Cevap dilekçesi **2 hafta**; hâkim bir defaya mahsus en çok **1 ay** ek süre verir.',
      'İstinaf **2 hafta**; temyiz **1 ay**.',
      'İstinafta harç veya gider eksiği: **1 haftalık kesin süre**. Dava dilekçesinde eksik (talep sonucu vb.): **1 hafta** kesin süre, tamamlanmazsa açılmamış sayılır.',
      'Gider avansı eksiği: **2 haftalık** kesin süre, verilmezse usulden ret.',
      'Görevsizlik veya yetkisizlikte kesinleşmeden **2 hafta** içinde gönderme istenmezse dava açılmamış sayılır.',
      'Eski hâle getirme: engelin kalkmasından **2 hafta**. Adli tatile tabi işte süre tatilin bitiminden **1 hafta** uzar.',
      'Tanık davetiyesi duruşmadan en az **1 hafta** önce tebliğ edilir.',
    ],
    t: 'Cevap, istinaf, harç eksiği ve dava dilekçesi eksiği süreleri aynı soruda birbirinin çeldiricisi.',
  },
  {
    id: 'hmk-yetki', d: 'hmk', k: 'Yetki ve görev', f: '6 soru',
    m: [
      'Genel yetki: davalının dava tarihindeki **yerleşim yeri**.',
      'Kesin yetki: taşınmaz üzerindeki ayni hak davaları (taşınmazın bulunduğu yer), terekenin paylaşımı gibi miras davaları (murisin son yerleşim yeri).',
      'Yetki sözleşmesi yalnız **tacirler ve kamu tüzel kişileri** arasında, **yazılı**, kesin yetki dışında; aksi yoksa sözleşilen mahkeme **münhasır** yetkili.',
      'Kesin olmayan yetkiye itiraz cevap dilekçesinde ilk itiraz olarak ve **yetkili mahkemeyi göstererek**; göstermeyen itiraz dikkate alınmaz.',
      'Genel görevli asliye hukuk. **Sulh hukuk**: kiradan doğan bütün davalar, ortaklığın giderilmesi, zilyetliğin korunması, kat mülkiyeti davaları, çekişmesiz yargı.',
    ],
    t: '"Yetkili mahkemeyi göstermese de itiraz dikkate alınır" yanlış şıktı ve doğru cevaptı.',
  },
  {
    id: 'hmk-feragat', d: 'hmk', k: 'Feragat, kabul, ıslah', f: '5 soru · üç sınavda',
    m: [
      'Feragat ve kabul dilekçeyle ya da duruşmada **sözlü** (tutanağa geçer); karşı tarafın rızası gerekmez; şarta bağlanamaz.',
      '**Hüküm kesinleşinceye kadar** yapılabilir; kesin hüküm sonucu doğurur. Vekil için **özel yetki** gerekir.',
      'Islah: aynı davada **bir kez**, tahkikat sona erinceye kadar; tamamen veya kısmen.',
      'Belirsiz alacak davasında talep artırımı ıslah değildir; dava açılınca alacağın tamamı için zamanaşımı kesilir.',
    ],
    t: '"Feragat mutlaka yazılı olmalıdır" ve "feragat her zaman yapılabilir" iki ayrı sınavda yanlış şıktı.',
  },
  {
    id: 'hmk-delil-tedbir', d: 'hmk', k: 'Tanık, ikrar, tedbir, istinaf', f: '8 soru',
    m: [
      'Tanık **15 yaşını doldurmamışsa** yeminsiz dinlenir (18 çeldirici).',
      'İkrar türleri: basit, bileşik (yeni vakıa ekler), vasıflı (vakıayı başka nitelikte kabul eder).',
      'İhtiyati tedbirde teminat kural; şartlar değişirse hâkim teminatı **artırabilir veya azaltabilir**.',
      'Dava açılmadan tedbir alınmışsa **2 hafta** içinde dava açılır. Haksız tedbir için teminatın iadesinden önce **1 ay** içinde tazminat davası.',
      'İstinafta **karşı dava, davaya müdahale, yetki sözleşmesi** yapılamaz; mücbir sebeple gösterilemeyen delil gösterilebilir. Manevi tazminatta miktara bakılmaksızın istinaf.',
      'Yargılama ilkeleri: tasarruf, taraflarca getirilme, taleple bağlılık, hukuki dinlenilme.',
    ],
    t: 'HMK sınavın en yüksek ters kök oranına sahip bloğu: iki sorudan biri "yanlıştır".',
  },

  /* ---------------- İCRA VE İFLAS · 70–75 ---------------- */
  {
    id: 'icra-yol', d: 'icra', k: 'İtiraz ve şikâyet yolları', f: '6 soru',
    m: [
      'İlamsız takipte ödeme emrine itiraz **7 gün**, **icra dairesine**; takip durur.',
      'Kambiyo senetlerine mahsus takipte borca veya imzaya itiraz **5 gün**, **icra mahkemesine**; takip kendiliğinden durmaz.',
      'Şikâyet: işlemi öğrenmeden **7 gün**, **icra mahkemesine**; hakkın yerine getirilmemesi ve kamu düzeni hâllerinde süresiz. Şikâyet işlemi kural olarak **durdurmaz**.',
      'Bononun aslının verilmemesi ya da vadenin gelmemesi: **7 gün içinde şikâyet, icra mahkemesi** (iki sınavda aynı cevap).',
      'İcra mahkemesi duruşmasız işlerde en geç **10 gün** içinde karar verir; ilgililer gelmese de karar verir.',
      'İtirazın iptali **1 yıl**, genel mahkeme; itirazın kaldırılması **6 ay**, icra mahkemesi; gecikmiş itiraz **3 gün**; borçtan kurtulma **7 gün**.',
    ],
    t: 'Beş şıkta itiraz ve şikâyet, icra dairesi ve icra mahkemesi, 5 ve 7 gün çaprazlanıyor.',
  },
  {
    id: 'icra-haciz', d: 'icra', k: 'Haciz ve ilamlı icra', f: '10 soru · her sınavda',
    m: [
      'Haciz talebi ödeme emrinin tebliğinden **1 yıl** içinde (hak düşürücü); icra dairesi talepten **3 gün** içinde haczi yapar.',
      'Satış talebi hacizden itibaren **1 yıl** içinde.',
      'Menfi tespit: takipten önce veya sonra; **%15** teminatla paranın alacaklıya ödenmesi durdurulabilir. Ödemeden sonra **istirdat**: **1 yıl**.',
      'İcranın geri bırakılması (itfa, imhal, zamanaşımı): **takibin yapıldığı yer icra mahkemesi**.',
      'Ödeme emrine itiraz etmeyen borçluda takip kesinleşir; sonraki imkânlar menfi tespit ve istirdattır.',
    ],
    t: 'Tek soruda on süre kombinasyonu denendi (6 ay/3 gün, 1 yıl/7 gün...). Süreyi başlangıç anıyla birlikte bil: ödeme emrinin tebliği.',
  },
  {
    id: 'icra-iflas', d: 'icra', k: 'İflas ve konkordato', f: '9 soru · her sınavda',
    m: [
      'Genel iflas yolunda itiraz **7 gün**, icra dairesine; alacaklı **asliye ticaret**ten itirazın kaldırılması ve iflas ister, ödeme emrinin tebliğinden **1 yıl** içinde. Kambiyoya dayalı iflasta **5 gün**.',
      'İflas idaresini: alacaklıların gösterdiği **6** aday arasından **icra mahkemesi** 3 kişi seçer.',
      '**İflasın kapanması müflislik sıfatını kaldırmaz**; kapanma kararına **2 hafta** içinde istinaf.',
      'Geçici mühlet **3 ay**, komiserin gerekçeli talebiyle en çok **2 ay** uzatılır; **resen uzatılamaz**, uzatma kararına kanun yolu kapalı.',
      'Kesin mühlet **1 yıl** + en çok **6 ay**. Mühlette takip yapılamaz, ihtiyati haciz uygulanmaz.',
      'Kesin mühlette mahkeme izni olmadan taşınmaz devri, rehin, kefalet, bağış yapılamaz. Komiser işlemlerine şikâyet: **asliye ticaret mahkemesi**.',
    ],
    t: 'Aynı bilgi iki sınavda ters yönden: iflas idaresini icra mahkemesi seçer; "asliye ticaretin görevi" diye konulunca yanlış.',
  },

  /* ---------------- CEZA HUKUKU · 76–84 ---------------- */
  {
    id: 'ceza-ictima', d: 'ceza', k: 'İçtima', f: '6 soru · üç sınavda',
    m: [
      '**Gerçek içtima** kural: her suçtan ayrı ceza.',
      '**Fikrî içtima**: tek fiille farklı suçlar → en ağır cezayı gerektiren suçtan ceza.',
      '**Aynı nev\'iden fikrî içtima**: tek fiille aynı suç birden çok kişiye → tek ceza, **1/4 – 3/4** artırım.',
      '**Zincirleme suç**: aynı suç işleme kararıyla, farklı zamanlarda, aynı kişiye karşı → tek ceza, 1/4 – 3/4 artırım. **Kasten öldürme, kasten yaralama, işkence, yağma**da uygulanmaz.',
      '**Bileşik suç**: biri ötekinin unsuru veya ağırlaştırıcısı (yağma = hırsızlık + cebir veya tehdit) → tek suç.',
    ],
    t: 'Koşulsuz doğru şıka "dörtte birinden dörtte üçüne kadar" eklenip çeldirici yapıldı.',
  },
  {
    id: 'ceza-istirak', d: 'ceza', k: 'İştirak, teşebbüs, gönüllü vazgeçme', f: '6 soru',
    m: [
      'İştirak **yalnız kasten** işlenen suçlarda; taksirde iştirak yok.',
      '**Müşterek fail**: fiil üzerinde ortak hâkimiyet. **Dolaylı fail**: başkasını araç olarak kullanır; kusur yeteneği olmayanı kullanırsa ceza artar. **Azmettiren** fail gibi cezalanır; **yardım eden** indirimli.',
      'Teşebbüs: elverişli hareketlerle doğrudan başlanıp elde olmayan sebeple tamamlanamama; ceza **1/4 – 3/4** indirilir.',
      '**Gönüllü vazgeçme**: yalnız tamamlanan kısım başka suç oluşturuyorsa ondan ceza.',
      'Öldürmeye teşebbüs mü yaralama mı: kullanılan araç, darbe sayısı ve bölgesi, kastın yönü.',
    ],
    t: '"İştirak hükümleri hem kasten hem taksirle işlenen suçlarda geçerlidir" yanlış şıktı ve doğru cevaptı.',
  },
  {
    id: 'ceza-genel', d: 'ceza', k: 'Yaş, tekerrür, lehe kanun, müsadere', f: '7 soru',
    m: [
      '**12** yaşını doldurmamış çocuğa ceza verilmez, güvenlik tedbiri uygulanır. 12–15 arası algılama yeteneğine göre, 15–18 indirimli.',
      'Tekerrür süresi **infazdan** işler: 5 yıldan fazla hapiste **5 yıl**, diğerlerinde **3 yıl**. İnfaz edilmemiş cezası varken işlenen yeni suç tekerrür doğurur.',
      'Lehe kanun: suç tarihindeki ve sonraki kanunlardan failin lehine olan uygulanır. Kesintisiz suçta **kesintinin** gerçekleştiği andaki kanun.',
      'Suç ve ceza **yalnız kanunla**; CBK veya idari düzenlemeyle ceza artırılamaz.',
      'Eşya müsaderesi suçun **tamamlanmasını gerektirmez**; iyiniyetli üçüncü kişinin eşyası müsadere edilmez.',
    ],
    t: 'Olay: 1 yıl hapis, infaz edilmedi, kesinleşmeden 4 yıl sonra yeni suç. "3 yıl geçti, tekerrür yok" yanlış; süre infazdan başlar, tekerrür uygulanır.',
  },
  {
    id: 'ceza-ozel', d: 'ceza', k: 'Özel hükümler: komşu suçlar', f: '12 soru · her sınavda',
    m: [
      '**Yağma**: cebir veya tehditle malı alma ya da teslime zorlama. Hırsızlıktan hemen sonra malı elde tutmak için cebir de yağmadır; ayrı hırsızlık ve cebir değil.',
      '**Şantaj**: hakkı olan veya olmayan bir şeyi yapacağı ya da yapmayacağı ya da şerefe dokunacak şeyleri açıklayacağı tehdidiyle haksız çıkar. **Tehdit**: hayat, vücut, cinsel dokunulmazlık veya malvarlığına saldırı ile korkutma.',
      '**İntihara yönlendirme**: kişi kendi eliyle öldürür. Algılama yeteneği olmayanı yönlendirmek **kasten öldürme**.',
      '**İhmali davranışla öldürme**: kanundan, sözleşmeden veya önceki tehlikeli davranıştan doğan **garantörlük**. Garantör değilse **yardım veya bildirim yükümlülüğünün ihlali**.',
      '**Gebeliği sonlandırma**: rızayla **10 haftaya** kadar suç değil; **suç sonucu gebelikte 20 hafta**, hastanede uzman hekimce ve rızayla yapılırsa kimseye ceza yok.',
      '**Eziyet** ile kasten yaralamanın nitelikli hâlleri ayrı suçlardır.',
    ],
    t: 'Dört şık komşu suç adlarıyla kurulur. Olayı okurken suçun adını kendin koy, sonra şıklara bak.',
  },

  /* ---------------- CMK · 85–90 ---------------- */
  {
    id: 'cmk-koruma', d: 'cmk', k: 'Koruma tedbirleri', f: '4 soru',
    m: [
      'Gözaltı **24 saat**; toplu suçlarda savcı günlük uzatmalarla en çok **4 gün**.',
      '**Gözlem altına alma**: yalnız **hâkim veya mahkeme** kararıyla; bir seferde **3 hafta**, toplam en çok **3 ay**. Savcı karar veremez.',
      'Bilgisayarda arama, kopyalama, el koyma **soruşturmada da** yapılabilir; hâkim kararıyla, gecikmede sakınca varsa savcı.',
      'Gizli soruşturmacı yalnız katalog suçlarda ve hâkim kararıyla.',
      'Koruma tedbiri tazminatı: kararın kesinleşmesinden **3 ay**, her hâlde **1 yıl** içinde, **ağır ceza mahkemesi**.',
    ],
    t: '"Gözlem altına almada savcının kararı 24 saat içinde onaylanmazsa kalkar" yanlış şıktı: gözlemde savcı karar veremez.',
  },
  {
    id: 'cmk-tanik', d: 'cmk', k: 'Tanıklık', f: '3 soru · üç sınavda',
    m: [
      'Tanıklıktan çekinebilecekler: nişanlı, **eş (evlilik kalkmış olsa da)**, üstsoy altsoy, **3. derece** dahil kan ve **2. derece** dahil kayın hısımları, evlat edinen ve evlatlık.',
      '**Yeminsiz** dinlenenler: **15 yaşını doldurmamışlar**, ayırt etme gücü eksik olanlar, suça iştirakten şüpheli olanlar.',
      'Çekinme hakkı olup çekinmeyenlere yemin verdirmek hâkimin **takdirinde** (eski eş, evlatlık).',
      'Devlet sırrı tanıklığı: hâkim veya mahkeme başkanı tarafından **zabıt kâtibi olmadan** dinlenir.',
    ],
    t: 'Öncülde "18 yaşını tamamlamamış" yazıyordu, yanlıştı. Yeminsiz yaş sınırı 15.',
  },
  {
    id: 'cmk-durusma', d: 'cmk', k: 'Duruşma, müdafi, sorgu', f: '9 soru',
    m: [
      'Deliller duruşmada tartışılır; söz sırası: **katılan ve vekili, savcı (esas hakkında mütalaa), sanık ve müdafi**. Son söz sanığın.',
      'Duruşma açık; **18 yaşını doldurmamış sanıkta duruşma da hüküm de kapalı**.',
      'Zorunlu müdafi: çocuk, malul, sağır veya dilsiz, alt sınırı **5 yıldan fazla** hapis gerektiren suç.',
      'Soruşturmada ifade ve sorguda müdafi sayısı **üçü geçemez**; örgüt davasında duruşmada da en çok **3**.',
      'Yasak yöntemler: kötü davranma, işkence, zorla ilaç, yorma, aldatma, cebir ve tehdit, kanun dışı yarar vaadi. **Gözetleme listede yok.**',
      'Alt sınırı 5 yıldan fazla hapis gerektiren suçlarda **istinabe ile sorgu yapılamaz**.',
    ],
  },
  {
    id: 'cmk-karar', d: 'cmk', k: 'KYO, seri muhakeme, eski hâle getirme', f: '6 soru',
    m: [
      'Kovuşturmaya yer olmadığı kararına itiraz: **sulh ceza hâkimliği**. Yeni delille dava açılması için de sulh ceza hâkimliği kararı gerekir.',
      'Suçun hukuki niteliği değişirse sanığa önce **ek savunma hakkı** tanınır.',
      'Seri muhakeme: savcı teklif eder, şüpheli müdafi huzurunda kabul eder; **iştirakte bütün şüphelilerin kabulü** gerekir.',
      'Eski hâle getirme: engelin kalkmasından **2 hafta** (sınav böyle kabul etti); **ret kararına itiraz edilebilir**; dilekçe yerine getirmeyi kendiliğinden durdurmaz.',
    ],
    t: 'Merci kaydırması bu dersin bir numaralı tuzağı: ağır ceza, BAM, HSK, başsavcılık çeldirici.',
  },

  /* ---------------- İŞ VE SOSYAL GÜVENLİK · 91–96 ---------------- */
  {
    id: 'is-guvence', d: 'is', k: 'İş güvencesi ve işe iade', f: '3 soru · üç sınavda',
    m: [
      'Şartlar: **30** veya daha çok işçili işyeri, en az **6 ay** kıdem, belirsiz süreli sözleşme, işveren vekili olmamak.',
      'Fesih tebliğinden **1 ay** içinde **arabulucu**; anlaşılamazsa son tutanaktan **2 hafta** içinde iş mahkemesi.',
      'Kesinleşen kararın tebliğinden **10 iş günü** içinde işçi başvurur; işveren **1 ay** içinde işe başlatır.',
      'Başlatmazsa iş güvencesi tazminatı en az **4**, en çok **8** aylık ücret; boşta geçen süre ücreti en çok **4 ay**.',
    ],
    t: 'İki süre yer değiştiriyor: arabulucu 1 ay, dava 2 hafta.',
  },
  {
    id: 'is-fesih', d: 'is', k: 'Fesih ve süreler', f: '6 soru',
    m: [
      'Bildirim süreleri: 6 aydan az **2**, 6 ay–1,5 yıl **4**, 1,5–3 yıl **6**, 3 yıldan fazla **8** hafta.',
      'Haklı fesih hakkı öğrenmeden **6 iş günü**, her hâlde fiilden **1 yıl** içinde kullanılır.',
      'Hastalık ve kaza sebebiyle devamsızlık, bildirim süresini **6 hafta** aşınca işveren derhâl fesheder (1 yıl kıdemde 4 + 6 = **10 hafta**).',
      'Esaslı değişiklik yazılı bildirilir; işçi **6 iş günü** içinde yazılı kabul etmezse bağlamaz.',
      'Yeni iş arama izni: bildirim süresinde günde en az **2 saat**.',
      'Ücret en geç ayda bir (sözleşmeyle 1 haftaya indirilebilir); ödeme gününden **20 gün** geçerse işçi çalışmaktan kaçınabilir; zamanaşımı **5 yıl**; haczedilebilir kısım en çok **1/4**.',
    ],
    t: 'Birim değişiyor: aynı eşik bir soruda gün, ötekinde hafta.',
  },
  {
    id: 'is-diger', d: 'is', k: 'Engelli, geçici iş, sendika, işsizlik', f: '9 soru',
    m: [
      '**50** ve üstü işçide özel sektör **%3** engelli çalıştırır. **Çırak ve yer altı işçileri sayılmaz**; aynı ildeki işyerleri birlikte hesaplanır.',
      'Geçici işçi sayısı işçi sayısının **1/4**\'ünü geçemez; **10** veya daha az işçili yerde en çok **5**.',
      'İşyeri devrinde devreden ve devralan önceki borçlardan birlikte sorumlu; devredenin sorumluluğu **2 yıl**. Devir tek başına haklı fesih sebebi değil.',
      'Sendika üyeliği **15 yaş**; başvuru **30 gün** içinde reddedilmezse kabul sayılır.',
      'İşsizlik ödeneği: son **120 gün** kesintisiz + son 3 yılda **600 gün** prim → **180 gün**; 900 → 240; 1080 → 300 gün.',
      'Yıllık izin: 1–5 yıl **14**, 5–15 yıl **20**, 15 yıldan fazla **26** gün; 18 ve daha küçük ile 50 ve üstü yaşta en az **20** gün.',
    ],
  },

  /* ---------------- VERGİ VE VERGİ USUL · 97–102 ---------------- */
  {
    id: 'ver-gelir', d: 'vergi', k: 'Gelir unsurları', f: '4 soru · son sınavda art arda 2',
    m: [
      'Yedi unsur: **ticari kazanç, zirai kazanç, ücret, serbest meslek kazancı, gayrimenkul sermaye iradı, menkul sermaye iradı, diğer kazanç ve iratlar**.',
      'Diğer kazanç ve iratlar: **değer artış kazancı** (ör. taşınmazın edinmeden itibaren **5 yıl** içinde satışı) ve arızi kazanç.',
      'Kurumların yönetim kurulu başkan ve üyelerine verilen **kâr payları menkul sermaye iradı**.',
      'Ticari kazanç: devamlılık ve organizasyon. Kira geliri gayrimenkul sermaye iradıdır; işletmeye dahil taşınmazın kirası ticari kazanç.',
    ],
  },
  {
    id: 'ver-usul', d: 'vergi', k: 'Tarh, ceza, zamanaşımı', f: '10 soru · her sınavda',
    m: [
      'Tarh türleri: **beyana dayanan, ikmalen, resen, idarece**. İkmalen: defter ve kanuni ölçülere dayanıp eksik kalan kısım. Resen: defter ve belge yok veya güvenilmez.',
      '**Gecikme faizi**: tarhın gecikmesi. **Gecikme zammı**: vadesinde ödenmeyen alacak. **Tecil faizi**: taksitlendirme.',
      'İzaha davette vergi ziyaı cezası **%20** kesilir.',
      'Vergi ziyaı: verginin **eksik tahakkuku**, geç tahakkuku veya **haksız iadesi**. Geç tahsil vergi ziyaı değil.',
      'VUK\'ta iştirak hükümleri: defterde **muhasebe hilesi** ve defteri **yok etme** gibi kaçakçılık fiilleri; defteri **tasdik ettirmeme** değil.',
      'Tarh zamanaşımı: vergi alacağının doğduğu yılı izleyen yılbaşından **5 yıl**. Tahsil zamanaşımı: vadenin rastladığı yılı izleyen yılbaşından **5 yıl**. Tecil en çok **36 ay**.',
    ],
    t: 'Öncüllü iki soru da "I ve II" ile çözüldü; üçüncü öncül hep setin dışında kalan hâldi.',
  },
  {
    id: 'ver-kdv', d: 'vergi', k: 'KDV, örtülü sermaye', f: '3 soru',
    m: [
      'KDV\'de vergiyi doğuran olay malın teslimi veya hizmetin yapılması; fatura daha önce düzenlenirse fatura anı.',
      'KDV matrahına **girer**: vade farkı, kur farkı, fiyat farkı, KDV dışındaki vergi, resim ve harçlar. **Girmez**: ticari teamüle uygun **iskontolar**.',
      'Örtülü sermaye: ortaklardan veya ilişkili kişilerden alınan borcun öz sermayenin **3 katını** aşan kısmı.',
    ],
  },

  /* ---------------- AVUKATLIK HUKUKU · 103–105 ---------------- */
  {
    id: 'av-hepsi', d: 'avukatlik', k: 'Avukatlık: listeler', f: '14 soru',
    m: [
      'Birleşir: hakemlik, arabuluculuk, belediye meclisi üyeliği, milletvekilliği, gazete sahipliği, tasfiye memurluğu, öğretim üyeliği, sermaye şirketi ortaklığı. **Birleşmez: tacirlik, esnaflık, sigorta prodüktörlüğü**, ücretli işler.',
      'Kabul ruhsatnamenin verilmesiyle hüküm doğurur. Staj **1 yıl** (6 ay adliye, 6 ay en az 5 yıllık avukat yanında). **65 yaş kabul engeli değil**.',
      'Baro **1 ay** içinde karar verir, susarsa ret; TBB\'ye **15 gün** içinde itiraz; Adalet Bakanlığı **2 ay** içinde onaylar, susarsa onay sayılır.',
      'Disiplin cezaları: uyarma, kınama, para cezası, işten çıkarma, meslekten çıkarma. **Kademe ilerlemesinin durdurulması avukatlık cezası değil.**',
      'Görev suçlarında soruşturma **Adalet Bakanlığı** iznine bağlı; uluslararası toplantıda bilgi verilecek makam da Adalet Bakanlığı.',
      'Vekâlet bitince evrakı saklama bildirimden **3 ay**. Çekişmeli hakkı edinme yasağı iş bitiminden **1 yıl**; eski kamu görevlisi ayrıldığı yere karşı **2 yıl** dava alamaz. Önceden **tanıklık** ve **2. derece hısımlık** işi reddetme sebebi değil. Baro **genel sekreterliği** organ değil.',
    ],
  },

  /* ---------------- HUKUK FELSEFESİ · 106–108 ---------------- */
  {
    id: 'fel-dusunur', d: 'felsefe', k: 'Düşünür eşleştirme', f: '8/13 soru "kimdir"',
    m: [
      '**Farabi**: Medinetü\'l Fazıla, erdemli kent. **İbni Haldun**: Mukaddime, ümran, asabiyet.',
      '**Platon**: Sokrates\'in öğrencisi; Devlet, Yasalar, filozof kral. **Aristoteles**: Platon\'un öğrencisi; Politika, dağıtıcı ve denkleştirici adalet.',
      '**Hobbes**: Leviathan, doğa durumu. **Locke**: doğal haklar, direnme. **Rousseau**: genel irade. **Montesquieu**: Kanunların Ruhu, kuvvetler ayrılığı.',
      '**Hegel**: diyalektik idealizm, mutlak ruh. **Kant**: kategorik imperatif. **Kelsen**: temel norm. **Bentham**: faydacılık.',
      '**Durkheim**: Toplumsal İşbölümü, mekanik dayanışma (cezalandırıcı hukuk), organik dayanışma (onarıcı hukuk). **Ehrlich**: yaşayan hukuk. **Savigny**: halk ruhu.',
      '"Olamaz" sorularında cevap akımın tam tersi iddiadır: realizm hukukun **kapalı sistem** olduğunu söylemez.',
    ],
    t: 'John Locke dört kez çeldirici oldu, bir kez bile doğru cevap olmadı.',
  },

  /* ---------------- TÜRK HUKUK TARİHİ · 109–111 ---------------- */
  {
    id: 'tar-osmanli', d: 'tarih', k: 'Osmanlı kurumları', f: '11 soru, hiç ters kök yok',
    m: [
      'Kadı yardımcıları: **Kassam** miras mallarını paylaştırır, **Şuhûdü\'l-hal** yargılamaya gözlemci olarak katılır, **Naib** kadı vekili, **Muhzır** davetçi, **Ehl-i hibre** bilirkişi.',
      '**Ayak Divanı**: acil durumda padişah başkanlığında olağanüstü toplantı. **Nişancı**: tuğra çeker.',
      '**Zürrî vakıf**: evlat ve soy yararına. **Şer\'iyye sicilleri**: mahkeme kayıtları.',
      '**Mecelle**: 1868–1876, 1851 madde, Ahmet Cevdet Paşa başkanlığında; eşya ve borçlar hukuku. "Memnu" = **yasak**.',
      'Kronoloji: **Sened-i İttifak (1808) → Tanzimat (1839) → Islahat (1856)**.',
      'Kaynaklar: Medeni ve Borçlar İsviçre; Ceza İtalya (Zanardelli); **HUMK 1927 İsviçre Neuchâtel kantonu**. Göktürk **kitabeleri**: Bilge Kağan, Kül Tigin, Tonyukuk.',
    ],
    t: 'Kadı yardımcıları beşlisi iki sınavda aynen geldi, cevap farklıydı. Kökteki tarifi oku.',
  },

  /* ---------------- MİLLETLERARASI HUKUK · 112–114 ---------------- */
  {
    id: 'mil-genel', d: 'milletlerarasi', k: 'Andlaşma, BM, tanıma', f: '14 soru',
    m: [
      'Andlaşmayı onaylama **Cumhurbaşkanı** kararıyla. Jus cogens\'e aykırı andlaşma **mutlak butlan**.',
      'Asli kaynaklar: andlaşmalar, örf ve âdet, hukukun genel ilkeleri. **Yargı kararları ve öğreti yardımcı** kaynak.',
      'BM\'nin baş yargı organı **Uluslararası Adalet Divanı** (Lahey, 15 yargıç, 9 yıl, yalnız devletler). Sürekli Adalet Divanı Milletler Cemiyeti dönemi.',
      'BM Genel Kurulu: her üyenin en çok **5** temsilcisi, **1** oyu; önemli sorunlarda hazır bulunup oy verenlerin **2/3**\'ü.',
      'Güvenlik Konseyi: 15 üye, **9** olumlu oy, daimi üyelerin vetosu; çekimserlik veto değil.',
      'Örtülü tanıma: diplomatik ilişki, ikili andlaşma, konsolosa exequatur, bağımsızlık törenine temsilci. **Aynı konferansa katılmak** tanıma değil.',
    ],
    t: '"En çok 3 temsilci" yanlış ifadeydi ve doğru cevaptı.',
  },

  /* ---------------- MÖHUK · 115–117 ---------------- */
  {
    id: 'moh-uc-kanun', d: 'mohuk', k: 'Vatandaşlık, yabancılar, MÖHUK', f: 'her sınavda 3 kanun',
    m: [
      '5901: izinsiz yabancı devlet hizmetinde kalana vatandaşlığı kaybettirme **Cumhurbaşkanı** kararıyla; karar **Resmî Gazete**\'de yayımla hüküm doğurur.',
      'Kazanmada millî güvenlik engeli varsa teklifi **İçişleri Bakanlığı** reddeder.',
      '6458: uluslararası koruma statüsünü sona erdirmeyen hâl: **6 ay içinde çalışma izni için başvurmamak**.',
      '5718: hâkim MÖHUK\'u ve yabancı hukuku **resen** uygular; yabancı hukuk bulunamazsa **Türk hukuku**.',
      'Tenfiz isteminin reddine karşı temyiz **yerine getirmeyi durdurur**; **kısmen tenfiz mümkün**.',
      'Türkiye\'deki taşınmaza **Türk hukuku**; Türkiye\'de kalan mirasçısız tereke **Devlete** kalır.',
    ],
  },

  /* ---------------- GENEL KAMU HUKUKU · 118–120 ---------------- */
  {
    id: 'gk-aihs', d: 'genelkamu', k: 'AİHS ve temel kavramlar', f: '6 soru',
    m: [
      'OHAL\'de dahi askıya alınamaz: **yaşam hakkı** (meşru savaş hariç), **işkence yasağı**, **kölelik ve kulluk**, **kanunsuz suç ve ceza olmaz**. **Zorla çalıştırma yasağı listede yok.**',
      '**Geçici tedbir** Sözleşme metninde değil, **AİHM İçtüzüğü**\'nde düzenlenir.',
      '**Kamu hukuku tüzel kişileri** AİHM\'e bireysel başvuru yapamaz.',
      'İmzalanıp onaylanmamış protokole dayanan başvuru: **konu bakımından bağdaşmazlık**, kabul edilemez.',
      'Halk teşebbüsü: seçmenler imzayla kanun ister, parlamento **görüşmek zorunda**. Jellinek: sosyal güvenlik hakkı **pozitif statü**. Devletin borçlanması ve dava ehliyeti **tüzel kişiliğinden** gelir.',
    ],
    t: '"I, II ve III" refleksi: zorla çalıştırma bilinen bir yasak olduğu için hepsi doğru sanıldı; cevap I ve III idi.',
  },
];
