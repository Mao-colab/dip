const db     = require('../db/connection');
const PDFDoc = require('pdfkit');

// Общая функция построения PDF-документа
function buildPdf(res, filename, drawFn) {
  const doc = new PDFDoc({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  // Базовый шрифт (встроенный Helvetica — кириллица через latin транслит)
  doc.registerFont('Regular', 'Helvetica');
  doc.registerFont('Bold',    'Helvetica-Bold');

  drawFn(doc);
  doc.end();
}

function header(doc, title, subtitle) {
  doc.font('Bold').fontSize(16).text('MT — Брокер', { align: 'center' });
  doc.font('Regular').fontSize(10).text('Платформа грузовых перевозок РБ', { align: 'center' });
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#d97706');
  doc.moveDown(0.5);
  doc.font('Bold').fontSize(14).text(title, { align: 'center' });
  if (subtitle) doc.font('Regular').fontSize(10).text(subtitle, { align: 'center' });
  doc.moveDown(1);
}

function row(doc, label, value) {
  const y = doc.y;
  doc.font('Bold').fontSize(9).text(label, 50, y, { width: 180 });
  doc.font('Regular').fontSize(9).text(String(value || '—'), 240, y, { width: 305 });
  doc.moveDown(0.4);
}

function divider(doc) {
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).dash(3, { space: 3 }).stroke('#e5e7eb');
  doc.undash().moveDown(0.5);
}

// GET /api/v1/pdf/load/:id/ttn
async function generateTtn(req, res) {
  try {
    const [[load]] = await db.execute(
      `SELECT l.*,
              u1.name AS driver_name, u1.phone AS driver_phone,
              u2.name AS dispatcher_name,
              GROUP_CONCAT(CONCAT(lv.year,' ',lv.make,' ',IFNULL(lv.type,'')) SEPARATOR '; ') AS vehicles
       FROM loads l
       LEFT JOIN Users u1 ON u1.id = l.driver_id
       LEFT JOIN Users u2 ON u2.id = l.dispatcher_id
       LEFT JOIN load_vehicles lv ON lv.load_id = l.id
       WHERE l.id = ?
       GROUP BY l.id`,
      [req.params.id]
    );
    if (!load) return res.status(404).json({ error: 'Заказ не найден' });

    buildPdf(res, `TTN-${load.id}.pdf`, doc => {
      header(doc, `Товарно-транспортная накладная (форма TTN-1)`, `Заказ #${load.id}`);

      doc.font('Bold').fontSize(10).text('ГРУЗООТПРАВИТЕЛЬ', { underline: true });
      doc.moveDown(0.3);
      row(doc, 'Наименование:', load.shipper_name);
      row(doc, 'Телефон:', load.shipper_phone);
      row(doc, 'Адрес погрузки:', load.origin_addr);
      row(doc, 'Город:', load.origin_city);
      row(doc, 'Дата погрузки:', load.origin_date);
      row(doc, 'Контактное лицо:', load.origin_contact);
      divider(doc);

      doc.font('Bold').fontSize(10).text('ГРУЗОПОЛУЧАТЕЛЬ', { underline: true });
      doc.moveDown(0.3);
      row(doc, 'Адрес доставки:', load.destination_addr);
      row(doc, 'Город:', load.destination_city);
      row(doc, 'Дата доставки:', load.destination_date);
      row(doc, 'Контактное лицо:', load.destination_contact);
      row(doc, 'Телефон:', load.destination_phone);
      divider(doc);

      doc.font('Bold').fontSize(10).text('ПЕРЕВОЗЧИК', { underline: true });
      doc.moveDown(0.3);
      row(doc, 'Водитель:', load.driver_name);
      row(doc, 'Телефон водителя:', load.driver_phone);
      row(doc, 'Диспетчер:', load.dispatcher_name);
      divider(doc);

      doc.font('Bold').fontSize(10).text('ГРУЗ', { underline: true });
      doc.moveDown(0.3);
      row(doc, 'Описание (ТС):', load.vehicles);
      row(doc, 'Стоимость груза:', load.cod_amount ? `${load.cod_amount} BYN` : '—');
      row(doc, 'Оплата водителю:', `${load.driver_pay} BYN`);
      row(doc, 'Статус оплаты:', load.driver_pay_status);
      divider(doc);

      row(doc, 'Статус заказа:', load.status);
      row(doc, 'Дата создания:', new Date(load.created_at).toLocaleDateString('ru-RU'));

      doc.moveDown(2);
      doc.font('Bold').fontSize(9).text('Подписи сторон:', { underline: true });
      doc.moveDown(1);
      const sigY = doc.y;
      doc.font('Regular').fontSize(9)
         .text('Грузоотправитель: ___________________', 50,  sigY)
         .text('Перевозчик:       ___________________', 320, sigY);
      doc.moveDown(1.5);
      const sigY2 = doc.y;
      doc.text('Грузополучатель:  ___________________', 50,  sigY2)
         .text('Дата:             ___________________', 320, sigY2);
    });
  } catch (err) {
    console.error('[PDF] generateTtn:', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Ошибка генерации PDF' });
  }
}

// GET /api/v1/pdf/load/:id/cmr
async function generateCmr(req, res) {
  try {
    const [[load]] = await db.execute(
      `SELECT l.*, u1.name AS driver_name, u1.phone AS driver_phone
       FROM loads l LEFT JOIN Users u1 ON u1.id = l.driver_id
       WHERE l.id = ?`,
      [req.params.id]
    );
    if (!load) return res.status(404).json({ error: 'Заказ не найден' });

    buildPdf(res, `CMR-${load.id}.pdf`, doc => {
      header(doc, 'CMR — Международная транспортная накладная', `Заказ #${load.id}`);
      doc.font('Regular').fontSize(9).text('(Конвенция КДПГ / CMR Convention, Женева 1956)', { align: 'center' });
      doc.moveDown(1);

      row(doc, '1. Грузоотправитель:', load.shipper_name);
      row(doc, '2. Адрес погрузки:', `${load.origin_city}, ${load.origin_addr}`);
      row(doc, '3. Грузополучатель:', load.destination_contact);
      row(doc, '4. Место назначения:', `${load.destination_city}, ${load.destination_addr}`);
      row(doc, '5. Дата принятия груза:', load.origin_date);
      row(doc, '6. Место принятия груза:', load.origin_city);
      row(doc, '7. Перевозчик:', load.driver_name);
      row(doc, '8. Дата CMR-накладной:', new Date().toLocaleDateString('ru-RU'));
      divider(doc);
      row(doc, '15. Стоимость перевозки:', `${load.driver_pay} BYN`);
      row(doc, '16. Статус заказа:', load.status);
      divider(doc);

      doc.moveDown(1.5);
      doc.font('Bold').fontSize(9).text('Подписи:');
      doc.moveDown(0.8);
      doc.font('Regular').fontSize(9)
         .text('Отправитель: ___________________', 50, doc.y)
         .text('Перевозчик: ___________________',  320, doc.y - doc.currentLineHeight());
      doc.moveDown(1.5);
      doc.text('Получатель: ___________________', 50, doc.y)
         .text('М.П. ___________________',        320, doc.y - doc.currentLineHeight());
    });
  } catch (err) {
    console.error('[PDF] generateCmr:', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Ошибка генерации PDF' });
  }
}

// GET /api/v1/pdf/load/:id/invoice
async function generateInvoice(req, res) {
  try {
    const [[load]] = await db.execute(
      `SELECT l.*, u1.name AS driver_name, u2.name AS dispatcher_name
       FROM loads l
       LEFT JOIN Users u1 ON u1.id = l.driver_id
       LEFT JOIN Users u2 ON u2.id = l.dispatcher_id
       WHERE l.id = ?`,
      [req.params.id]
    );
    if (!load) return res.status(404).json({ error: 'Заказ не найден' });

    const invoiceNo = `MT-${String(load.id).padStart(6, '0')}`;

    buildPdf(res, `Invoice-${invoiceNo}.pdf`, doc => {
      header(doc, 'СЧЁТ НА ОПЛАТУ', `№ ${invoiceNo} от ${new Date().toLocaleDateString('ru-RU')}`);

      row(doc, 'Исполнитель:', 'MT Брокер (ваша компания)');
      row(doc, 'Заказчик:', load.shipper_name || '—');
      divider(doc);

      // Таблица услуг
      doc.font('Bold').fontSize(9);
      const th = doc.y;
      doc.text('№', 50, th, { width: 30 })
         .text('Наименование услуги', 85, th, { width: 270 })
         .text('Кол-во', 360, th, { width: 60 })
         .text('Сумма, BYN', 425, th, { width: 120 });
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#374151');
      doc.moveDown(0.3);

      doc.font('Regular').fontSize(9);
      const r1 = doc.y;
      doc.text('1', 50, r1, { width: 30 })
         .text(`Транспортные услуги: ${load.origin_city} — ${load.destination_city}`, 85, r1, { width: 270 })
         .text('1', 360, r1, { width: 60 })
         .text(`${load.driver_pay} BYN`, 425, r1, { width: 120 });
      doc.moveDown(0.8);

      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e5e7eb');
      doc.moveDown(0.5);
      doc.font('Bold').fontSize(10).text(`ИТОГО: ${load.driver_pay} BYN`, { align: 'right' });

      divider(doc);
      row(doc, 'Статус оплаты:', load.driver_pay_status);
      row(doc, 'Дата заказа:', new Date(load.created_at).toLocaleDateString('ru-RU'));

      doc.moveDown(2);
      doc.font('Regular').fontSize(8).text(
        'Счёт действителен 30 дней с даты выставления. Оплата в течение 5 банковских дней.',
        { color: '#9ca3af' }
      );
    });
  } catch (err) {
    console.error('[PDF] generateInvoice:', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Ошибка генерации PDF' });
  }
}

module.exports = { generateTtn, generateCmr, generateInvoice };
