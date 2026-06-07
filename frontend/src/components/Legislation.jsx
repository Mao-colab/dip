/**
 * Legislation.jsx — Документальное сопровождение грузооборота РБ
 * Стиль: DM Sans, amber #d97706, иконки из icons.js
 */
import { useState } from 'react';
import {
  IconDocument, IconTruck, IconCheck, IconClock,
  IconOrders, IconFolder, IconPayment, IconKey,
} from '../icons';

const PRIMARY  = '#d97706';
const LIGHT    = '#fffbeb';
const BORDER   = '#e5e7eb';
const BG       = '#f8fafc';
const RED      = '#dc2626';
const GREEN    = '#16a34a';
const BLUE     = '#2563eb';
const PURPLE   = '#7c3aed';
const GRAY     = '#6b7280';

// ── Секции ────────────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'internal',
    title: 'Внутренние перевозки',
    Icon: IconTruck,
    color: PRIMARY,
    docs: [
      {
        code: 'ТТН-1',
        title: 'Товарно-транспортная накладная (форма ТТН-1)',
        Icon: IconDocument,
        required: true,
        basis: 'Постановление СМ РБ от 30.06.2008 № 970; Инструкция МФ РБ от 30.11.2012 № 196',
        copies: 3,
        copyDesc: '1-я — грузоотправитель, 2-я — грузополучатель, 3-я — перевозчик',
        who: 'Грузоотправитель совместно с перевозчиком',
        when: 'До начала перевозки. Обязательна при каждой перевозке груза автотранспортом.',
        fields: [
          'Наименование и адрес грузоотправителя и грузополучателя',
          'Маршрут — пункты погрузки и разгрузки',
          'Наименование, вес брутто и количество мест груза',
          'Гос. номер ТС и прицепа',
          'ФИО водителя',
          'Подписи и печати всех сторон',
        ],
        tip: 'С 2023 г. в РБ внедряется электронная ТТН (е-ТТН) — уточняйте у контрагента.',
      },
      {
        code: 'Путевой лист',
        title: 'Путевой лист грузового автомобиля',
        Icon: IconClock,
        required: true,
        basis: 'Постановление МТ РБ от 30.12.1999 № 37; ТКП 248-2010',
        copies: 1,
        copyDesc: 'Остаётся у перевозчика, хранится 5 лет',
        who: 'Перевозчик (диспетчер/механик) оформляет до выезда',
        when: 'Обязателен перед каждым выездом. Без него выезд запрещён.',
        fields: [
          'Дата и номер путевого листа',
          'Наименование организации-перевозчика',
          'ФИО и табельный номер водителя',
          'Гос. номер ТС',
          'Показания спидометра при выезде и возврате',
          'Отметка о предрейсовом медосмотре водителя',
          'Подпись механика о техническом состоянии ТС',
        ],
        tip: 'Без отметки о медосмотре водителя выезд запрещён — штраф до 50 БВ.',
      },
      {
        code: 'Договор',
        title: 'Договор перевозки / заявка-поручение',
        Icon: IconFolder,
        required: false,
        basis: 'Глава 40 ГК РБ; ст. 36–49 Закона РБ № 278-З от 14.08.2007',
        copies: 2,
        copyDesc: 'По одному экземпляру каждой стороне',
        who: 'Составляется между грузоотправителем и перевозчиком',
        when: 'До начала перевозки. При разовых рейсах — заявка-поручение.',
        fields: [
          'Предмет договора — описание груза и маршрут',
          'Сроки перевозки',
          'Стоимость и порядок оплаты',
          'Ответственность сторон',
          'Реквизиты и подписи сторон',
        ],
        tip: 'При систематических перевозках — рамочный договор + разовые заявки.',
      },
      {
        code: 'Акт ВР',
        title: 'Акт выполненных работ',
        Icon: IconCheck,
        required: false,
        basis: 'ГК РБ; Закон РБ «О бухгалтерском учёте»; Постановление МФ № 196',
        copies: 2,
        copyDesc: 'Для грузоотправителя и перевозчика',
        who: 'Перевозчик оформляет после выполнения перевозки',
        when: 'После доставки груза. Необходим для безналичного расчёта.',
        fields: [
          'Наименование услуги',
          'Маршрут, дата выполнения',
          'Стоимость услуг (с НДС или без)',
          'Реквизиты и подписи сторон, печать',
        ],
        tip: 'Основание для бухгалтерского учёта у обеих сторон.',
      },
      {
        code: 'ЭСЧФ',
        title: 'Электронный счёт-фактура (ЭСЧФ)',
        Icon: IconPayment,
        required: false,
        basis: 'НК РБ, ст. 131; Постановление МНС № 15 от 25.04.2016',
        copies: 1,
        copyDesc: 'Электронный документ, подписывается ЭЦП в АИС «Налог-2»',
        who: 'Перевозчик-плательщик НДС',
        when: 'Не позднее 10-го числа месяца, следующего за месяцем оказания услуг.',
        fields: [
          'УНП продавца и покупателя',
          'Описание услуги перевозки',
          'Сумма без НДС, ставка и сумма НДС',
          'ЭЦП руководителя или уполномоченного лица',
        ],
        tip: 'Только для организаций и ИП на общей системе налогообложения.',
      },
    ],
  },
  {
    id: 'international',
    title: 'Международные перевозки',
    Icon: IconOrders,
    color: PURPLE,
    docs: [
      {
        code: 'CMR',
        title: 'Международная накладная CMR',
        Icon: IconDocument,
        required: true,
        basis: 'Конвенция КДПГ (Женева, 19.05.1956), ратифицирована РБ 27.11.1992',
        copies: 3,
        copyDesc: '1-я — отправитель, 2-я — с грузом (получателю), 3-я — перевозчик',
        who: 'Грузоотправитель совместно с перевозчиком',
        when: 'Обязательна при каждой международной перевозке в страны КДПГ.',
        fields: [
          'Отправитель и получатель (полные адреса)',
          'Место погрузки и место доставки',
          'Описание груза: наименование, вес брутто, количество мест',
          'Инструкции по таможне',
          'Перечень прилагаемых документов',
          'Подписи и штампы всех сторон',
        ],
        tip: 'Ответственность перевозчика — 8,33 SDR за 1 кг веса брутто.',
      },
      {
        code: 'МДП / TIR',
        title: 'Книжка МДП (Карнет TIR)',
        Icon: IconKey,
        required: false,
        basis: 'Таможенная конвенция о МДП (ООН, 1975); Получение — БАМАП',
        copies: 1,
        copyDesc: 'Листы отрываются на каждом таможенном посту',
        who: 'Перевозчик получает в БАМАП до начала рейса',
        when: 'При транзите через несколько таможенных территорий.',
        fields: [
          'Данные перевозчика и транспортного средства',
          'Маршрут перевозки (страны транзита)',
          'Описание груза',
          'Таможенные отметки на каждом пункте',
        ],
        tip: 'Срок действия — один рейс. Стоимость уточняйте в БАМАП.',
      },
      {
        code: 'Разрешение МТК',
        title: 'Разрешение на международную перевозку',
        Icon: IconDocument,
        required: true,
        basis: 'Закон РБ № 278-З от 14.08.2007; Постановление СМ № 949 от 28.07.2008',
        copies: 1,
        copyDesc: 'Выдаётся Министерством транспорта и коммуникаций РБ',
        who: 'Организация-перевозчик',
        when: 'До первого международного рейса.',
        fields: [
          'Наименование и УНП перевозчика',
          'Государственный номер ТС',
          'Вид и направление перевозок',
          'Срок действия разрешения',
        ],
        tip: 'Двусторонние разрешения с РФ, Польшей, Литвой — выдаются отдельно по каждому направлению.',
      },
      {
        code: 'CMR-страхование',
        title: 'Страхование ответственности перевозчика',
        Icon: IconPayment,
        required: true,
        basis: 'Конвенция КДПГ; национальное страховое законодательство РБ',
        copies: 1,
        copyDesc: 'Страховой полис — у водителя и в офисе',
        who: 'Страховщик: Белгосстрах, ЗАСО «ТАСК», ЗАСО «Промтрансинвест»',
        when: 'До начала международных перевозок, ежегодно.',
        fields: [
          'Наименование страхователя',
          'Страховая сумма (лимит ответственности)',
          'Период и территория действия полиса',
        ],
        tip: 'Рекомендуемый лимит — от 500 000 EUR. При въезде в ЕС нужна «Зелёная карта».',
      },
    ],
  },
  {
    id: 'special',
    title: 'Спецгрузы',
    Icon: IconTruck,
    color: RED,
    docs: [
      {
        code: 'ДОПОГ / ADR',
        title: 'Опасные грузы — ДОПОГ (ADR)',
        Icon: IconDocument,
        required: true,
        basis: 'Соглашение ADR (ЕЭК ООН); Постановление СМ РБ № 741',
        copies: 1,
        copyDesc: 'Сопроводительные документы у водителя',
        who: 'Грузоотправитель; свидетельство водителя — ГАИ МВД РБ',
        when: 'При перевозке любых веществ по классификации ADR.',
        fields: [
          'Транспортный документ ДОПОГ (UN-номер, класс опасности)',
          'Свидетельство о подготовке водителя ADR',
          'Свидетельство о допуске ТС к перевозке опасных грузов',
          'Письменные инструкции по безопасности',
          'Оранжевые информационные таблички на ТС',
        ],
        tip: 'Свидетельство ADR водителя — обучение + экзамен в ГАИ, срок 5 лет.',
      },
      {
        code: 'СГП',
        title: 'Спецразрешение — негабаритный / тяжеловесный груз',
        Icon: IconDocument,
        required: true,
        basis: 'Постановление СМ РБ от 11.07.2014 № 673; ТКП 227-2017',
        copies: 1,
        copyDesc: 'Выдаётся ГАИ МВД РБ / облисполкомом',
        who: 'Перевозчик подаёт заявку в ГАИ',
        when: 'Если масса, габариты или осевая нагрузка превышают нормы.',
        fields: [
          'Маршрут движения',
          'Сведения о ТС и характеристики груза',
          'Время движения (при ограничениях)',
          'Требования к сопровождению',
        ],
        tip: 'Нормы: ширина > 2,55 м, высота > 4 м, длина > 20 м, масса > 44 т.',
      },
      {
        code: 'Фитосанитар',
        title: 'Фитосанитарный сертификат',
        Icon: IconDocument,
        required: false,
        basis: 'Решение Совета ЕЭК № 157; Закон РБ «О карантине растений»',
        copies: 1,
        copyDesc: 'Оригинал следует с грузом',
        who: 'Государственная инспекция по семеноводству и карантину растений',
        when: 'При экспорте/импорте растительной продукции (зерно, овощи, фрукты, древесина).',
        fields: [
          'Ботаническое наименование продукции',
          'Количество и описание упаковок',
          'Страна происхождения и назначения',
          'Фитосанитарное заявление и подпись инспектора',
        ],
        tip: 'Срок действия сертификата — как правило, 14–30 дней с даты выдачи.',
      },
    ],
  },
  {
    id: 'driver',
    title: 'Документы водителя',
    Icon: IconKey,
    color: GREEN,
    docs: [
      {
        code: 'ВУ кат. C/CE',
        title: 'Водительское удостоверение (категория C / CE)',
        Icon: IconKey,
        required: true,
        basis: 'ПДД РБ; Закон РБ о дорожном движении',
        copies: 1,
        copyDesc: 'Оригинал у водителя',
        who: 'ГАИ МВД РБ',
        when: 'Постоянно при управлении грузовым ТС.',
        fields: [
          'Категория C — грузовые до 3,5 т без прицепа',
          'Категория CE — с прицепом свыше 750 кг',
          'Отметка о допуске ADR (для опасных грузов)',
          'Срок действия',
        ],
        tip: 'В ЕС принимается национальное ВУ РБ по Венской конвенции 1968 г.',
      },
      {
        code: 'Медсправка',
        title: 'Медицинская справка (ежегодная)',
        Icon: IconCheck,
        required: true,
        basis: 'Постановление МЗ РБ от 08.05.2008 № 89',
        copies: 1,
        copyDesc: 'Хранится у работодателя',
        who: 'Медицинское учреждение (поликлиника, МРЭО)',
        when: 'Ежегодно для водителей кат. C и CE. Предрейсовый осмотр — перед каждым выездом.',
        fields: [
          'Пригодность к управлению ТС',
          'Дата следующего планового осмотра',
          'Подпись врача-эксперта',
        ],
        tip: 'Отметка о предрейсовом медосмотре ставится в путевом листе.',
      },
      {
        code: 'СТС',
        title: 'Свидетельство о регистрации ТС',
        Icon: IconDocument,
        required: true,
        basis: 'Закон РБ о дорожном движении; ПДД РБ',
        copies: 1,
        copyDesc: 'Оригинал у водителя',
        who: 'ГАИ МВД РБ',
        when: 'Постоянно. Предъявляется при любой проверке.',
        fields: [
          'Гос. регистрационный знак',
          'Марка, модель, VIN',
          'Владелец ТС',
          'Отметка о пройденном техническом осмотре',
        ],
        tip: 'Технический осмотр грузовых ТС — каждые 2 года (новые — 4 года).',
      },
      {
        code: 'ОСАГО',
        title: 'Полис ОСАГО + Зелёная карта',
        Icon: IconPayment,
        required: true,
        basis: 'Указ Президента РБ № 530; Закон об обязательном страховании',
        copies: 1,
        copyDesc: 'Полис — у водителя',
        who: 'Белгосстрах, ЗАСО «ТАСК», ЗАСО «Промтрансинвест» и другие',
        when: 'Постоянно. Зелёная карта — при выезде за рубеж.',
        fields: [
          'Данные страхователя и ТС',
          'Срок действия',
          'Территория страхования',
        ],
        tip: 'Зелёная карта обязательна при въезде в ЕС и большинство стран СНГ.',
      },
    ],
  },
];

// ── Карточка одного документа ─────────────────────────────────────────────────
function DocCard({ doc, color, expanded, onToggle }) {
  const DIcon = doc.Icon || IconDocument;
  return (
    <div style={{
      background: '#fff', border: `1px solid ${BORDER}`,
      borderRadius: 12, marginBottom: 8, overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Шапка карточки */}
      <div
        style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
        onClick={onToggle}
      >
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: color + '18', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
        }}>
          <DIcon size={18} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#111827' }}>{doc.code}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: doc.required ? '#fee2e2' : '#f3f4f6',
              color: doc.required ? RED : GRAY,
            }}>
              {doc.required ? 'Обязательный' : 'По необходимости'}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#374151', fontWeight: 500, lineHeight: 1.3 }}>{doc.title}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{doc.basis}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color }}>{doc.copies}</div>
            <div style={{ fontSize: 10, color: GRAY }}>экз.</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', color: GRAY }}>
            <path d="M2 4.5L7 9.5L12 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Раскрытое содержимое */}
      {expanded && (
        <div style={{ borderTop: `1px solid #f3f4f6`, padding: '0 18px 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
            <div style={{ background: BG, borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 5 }}>Кто оформляет</div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{doc.who}</div>
            </div>
            <div style={{ background: BG, borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 5 }}>Когда требуется</div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{doc.when}</div>
            </div>
            <div style={{ gridColumn: '1/-1', background: BG, borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 5 }}>Экземпляры</div>
              <div style={{ fontSize: 12, color: '#374151' }}>{doc.copyDesc}</div>
            </div>
          </div>

          {/* Реквизиты */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>
              Обязательные реквизиты
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {doc.fields.map((field, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '6px 10px', background: color + '08',
                  borderRadius: 7, borderLeft: `3px solid ${color}`,
                }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginTop: 1, flexShrink: 0 }}>
                    <circle cx="6" cy="6" r="5" stroke={color} strokeWidth="1.3"/>
                    <path d="M3.5 6L5 7.5L8.5 4" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.4 }}>{field}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Подсказка */}
          {doc.tip && (
            <div style={{
              marginTop: 12, padding: '10px 14px',
              background: LIGHT, border: `1px solid ${PRIMARY}40`,
              borderRadius: 8, display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', background: PRIMARY,
                color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
              }}>!</div>
              <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>{doc.tip}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Главный компонент ─────────────────────────────────────────────────────────
export default function Legislation() {
  const [activeSection, setActiveSection] = useState('internal');
  const [expandedDoc, setExpandedDoc]     = useState(null);

  const section = SECTIONS.find(s => s.id === activeSection);
  const reqCount = section?.docs.filter(d => d.required).length ?? 0;
  const optCount = section?.docs.filter(d => !d.required).length ?? 0;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      overflow: 'hidden', fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* ── Заголовок + вкладки ── */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${BORDER}`, padding: '14px 24px 0' }}>
        <div style={{ marginBottom: 12 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>
            Документальное сопровождение грузооборота
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9ca3af' }}>
            Справочник требований для грузоперевозчиков Республики Беларусь
          </p>
        </div>
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
          {SECTIONS.map(s => {
            const SIcon = s.Icon;
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => { setActiveSection(s.id); setExpandedDoc(null); }}
                style={{
                  padding: '10px 16px', border: 'none', background: 'transparent',
                  cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap',
                  fontWeight: active ? 700 : 500,
                  color: active ? s.color : GRAY,
                  borderBottom: active ? `2.5px solid ${s.color}` : '2.5px solid transparent',
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                <SIcon size={14} color={active ? s.color : '#9ca3af'} />
                {s.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Контент ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: BG }}>
        {/* Плашка источников */}
        <div style={{
          background: '#fff', border: `1px solid ${BORDER}`,
          borderRadius: 10, padding: '10px 16px', marginBottom: 16,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%', background: BLUE,
            color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>i</div>
          <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
            Информация актуальна по нормам законодательства РБ.
            Актуальные редакции: <strong>pravo.by</strong>, <strong>mintrans.gov.by</strong>, <strong>tamby.info</strong>
          </div>
        </div>

        {/* Счётчики */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            ['Всего документов', section?.docs.length, section?.color],
            ['Обязательных', reqCount, RED],
            ['По необходимости', optCount, GRAY],
          ].map(([label, value, color]) => (
            <div key={label} style={{
              padding: '10px 16px', background: '#fff',
              border: `1px solid ${BORDER}`, borderRadius: 10,
            }}>
              <div style={{ fontSize: 10, color: GRAY, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Карточки */}
        {section?.docs.map(doc => (
          <DocCard
            key={doc.code}
            doc={doc}
            color={section.color}
            expanded={expandedDoc === doc.code}
            onToggle={() => setExpandedDoc(expandedDoc === doc.code ? null : doc.code)}
          />
        ))}

        {/* Полезные ссылки */}
        <div style={{
          marginTop: 20, background: '#fff', border: `1px solid ${BORDER}`,
          borderRadius: 12, padding: '16px 20px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconDocument size={14} color={PRIMARY} /> Официальные источники
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 8 }}>
            {[
              ['pravo.by',       'Нац. правовой интернет-портал'],
              ['mintrans.gov.by','Минтранс РБ — лицензии, разрешения'],
              ['bамап.бел',      'БАМАП — книжки МДП, допуск'],
              ['customs.gov.by', 'Таможенный комитет РБ'],
              ['tamby.info',     'Таможня — тарифы и ставки'],
              ['nalog.gov.by',   'МНС РБ — ЭСЧФ, налоги'],
            ].map(([url, desc]) => (
              <div key={url} style={{
                padding: '8px 12px', background: BG,
                borderRadius: 8, border: `1px solid ${BORDER}`,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: PRIMARY }}>{url}</div>
                <div style={{ fontSize: 11, color: GRAY, marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
