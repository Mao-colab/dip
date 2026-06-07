/**
 * demoData.js — демо-данные для белорусского рынка грузоперевозок
 * Инициализируется один раз для каждого нового пользователя (по логину)
 */

const today = new Date();
const fmt = (d) => d.toLocaleDateString('ru-RU');
const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo  = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return d; };
const daysAhead = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };

function makeData() {
  return {
    contacts: [
      { id:1001, name:'Иван Анатольевич Петров', initials:'ИП', role:'Водитель', phone:'+375 29 123-45-67', email:'petrov@gmail.com', city:'Минск', rating:5, notes:'Опытный дальнобойщик. Стаж 12 лет, знает маршруты ЕС.', color:'#2563eb', blacklisted:false, orders:7, balance:0 },
      { id:1002, name:'Сергей Владимирович Колесов', initials:'СК', role:'Водитель', phone:'+375 33 234-56-78', email:'kolesov@mail.ru', city:'Брест', rating:4, notes:'Специализация: Польша, Германия. Карточка МДП.', color:'#7c3aed', blacklisted:false, orders:5, balance:0 },
      { id:1003, name:'Михаил Николаевич Дубровский', initials:'МД', role:'Водитель', phone:'+375 44 345-67-89', email:'dubrovsky@tut.by', city:'Гомель', rating:4, notes:'Внутренние рейсы по РБ и Россия.', color:'#059669', blacklisted:false, orders:4, balance:0 },
      { id:1004, name:'Алексей Петрович Семёнов', initials:'АС', role:'Водитель', phone:'+375 29 456-78-90', email:'semenov@bk.ru', city:'Витебск', rating:5, notes:'Надёжный. Никаких претензий за 3 года.', color:'#d97706', blacklisted:false, orders:6, balance:0 },
      { id:1005, name:'Анна Ивановна Захарова', initials:'АЗ', role:'Диспетчер', phone:'+375 17 100-20-30', email:'zakharova@mt.by', city:'Минск', rating:5, notes:'Главный диспетчер.', color:'#be185d', blacklisted:false, orders:22, balance:0 },
      { id:1006, name:'Виктор Сергеевич Морозов', initials:'ВМ', role:'Диспетчер', phone:'+375 17 100-20-31', email:'morozov@mt.by', city:'Минск', rating:4, notes:'', color:'#0891b2', blacklisted:false, orders:14, balance:0 },
      { id:1007, name:'ООО «БелГрузТранс»', initials:'БГ', role:'Перевозчик', phone:'+375 17 200-30-40', email:'info@bgt.by', city:'Минск', rating:4, notes:'УНП 190123456. Парк 12 МАЗ.', color:'#2563eb', blacklisted:false, orders:15, balance:0 },
      { id:1008, name:'ООО «ЕвроКарго»', initials:'ЕК', role:'Перевозчик', phone:'+375 17 300-40-50', email:'eurocargo@eurocargo.by', city:'Минск', rating:5, notes:'Партнёр для рейсов в ЕС. TIR карнет.', color:'#059669', blacklisted:false, orders:9, balance:0 },
      { id:1009, name:'ИП Ковалёв Дмитрий Александрович', initials:'КД', role:'Перевозчик', phone:'+375 44 500-60-70', email:'kovalev-trans@mail.ru', city:'Гродно', rating:3, notes:'Задержка оплаты по заказу #10006.', color:'#9ca3af', blacklisted:false, orders:3, balance:0 },
      { id:1010, name:'Николай Фёдорович Красько', initials:'НК', role:'Перевозчик', phone:'+375 33 700-80-90', email:'krasko@bk.ru', city:'Могилёв', rating:2, notes:'Повторная проверка в 2024.', color:'#dc2626', blacklisted:true, orders:1, balance:0 },
    ],
    orders: [
      { id:'10001', status:'Доставлен', cod:'850', payType:'Безналичный расчёт', driverPay:'650', payStatus:'Оплачено', originAddr:'ул. Тимирязева, 65А', originCity:'Минск', originDate:iso(daysAgo(8)), originContact:'Сергей Иванов', originPhone:'+375 29 111-11-11', destAddr:'ул. Ленина, 12', destCity:'Брест', destDate:iso(daysAgo(7)), destContact:'Олег Кузнецов', destPhone:'+375 29 222-22-22', shipper:'ОАО «Минскпродукт»', shipperPhone:'+375 17 111-00-00', driver:'Иван Анатольевич Петров', dispatcher:'Анна Ивановна Захарова', vehicles:[{make:'МАЗ-5440А9',year:'2020',type:'Тентованный',vin:'YOD5440A9P0001234',price:'1500'}], notes:'Продовольственный груз. ТТН №БМ-0023451.', createdAt:fmt(daysAgo(9)) },
      { id:'10002', status:'Оплачен', cod:'1250', payType:'Безналичный расчёт', driverPay:'900', payStatus:'Оплачено', originAddr:'пр. Победителей, 100', originCity:'Минск', originDate:iso(daysAgo(12)), originContact:'Ирина Смирнова', originPhone:'+375 33 333-33-33', destAddr:'Бизнес-центр «Сфера»', destCity:'Варшава', destDate:iso(daysAgo(10)), destContact:'Jan Kowalski', destPhone:'+48 600 100 200', shipper:'ООО «БелМашЭкспорт»', shipperPhone:'+375 17 222-33-44', driver:'Сергей Владимирович Колесов', dispatcher:'Анна Ивановна Захарова', vehicles:[{make:'Volvo FH',year:'2019',type:'Тентованный с CMR',vin:'YV2RT40A9LA100001',price:'2800'}], notes:'CMR-накладная №0045. Карнет МДП №BL-00123.', createdAt:fmt(daysAgo(14)) },
      { id:'10003', status:'Забран', cod:'620', payType:'Безналичный расчёт', driverPay:'480', payStatus:'Не оплачено', originAddr:'ул. Советская, 8', originCity:'Гомель', originDate:iso(daysAgo(1)), originContact:'Пётр Фролов', originPhone:'+375 44 444-44-44', destAddr:'ул. Кирова, 45', destCity:'Минск', destDate:iso(daysAhead(0)), destContact:'Елена Власова', destPhone:'+375 29 555-55-55', shipper:'ОАО «Гомельхимпром»', shipperPhone:'+375 232 78-00-00', driver:'Михаил Николаевич Дубровский', dispatcher:'Виктор Сергеевич Морозов', vehicles:[{make:'МАЗ-6312В9',year:'2018',type:'Самосвал',vin:'YOD6312V9J0002345',price:'1200'}], notes:'Требуется ДОПОГ.', createdAt:fmt(daysAgo(2)) },
      { id:'10004', status:'Назначен', cod:'980', payType:'Безналичный расчёт', driverPay:'750', payStatus:'Не оплачено', originAddr:'пр. Независимости, 10', originCity:'Минск', originDate:iso(daysAhead(1)), originContact:'Дмитрий Орлов', originPhone:'+375 44 100-20-30', destAddr:'Gedimino pr. 11', destCity:'Вильнюс', destDate:iso(daysAhead(2)), destContact:'Tomas Žukauskas', destPhone:'+370 600 12345', shipper:'ООО «Белпродторг»', shipperPhone:'+375 17 300-10-20', driver:'Алексей Петрович Семёнов', dispatcher:'Анна Ивановна Захарова', vehicles:[{make:'Mercedes Actros',year:'2021',type:'Рефрижератор',vin:'WDB9634031L000001',price:'2200'}], notes:'Скоропортящийся груз. T +2...+6°C.', createdAt:fmt(daysAgo(1)) },
      { id:'10005', status:'Новый', cod:'420', payType:'Наличные', driverPay:'320', payStatus:'Не оплачено', originAddr:'ул. Победы, 22', originCity:'Брест', originDate:iso(daysAhead(3)), originContact:'Василий Тихонов', originPhone:'+375 29 600-70-80', destAddr:'ул. Ленина, 1', destCity:'Барановичи', destDate:iso(daysAhead(3)), destContact:'Наталья Куликова', destPhone:'+375 44 700-80-90', shipper:'ИП Тихонов В.В.', shipperPhone:'+375 29 600-70-80', driver:'', dispatcher:'Виктор Сергеевич Морозов', vehicles:[{make:'',year:'',type:'',vin:'',price:''}], notes:'Стройматериалы, негабарит.', createdAt:fmt(today) },
      { id:'10006', status:'Претензия', cod:'1100', payType:'Безналичный расчёт', driverPay:'800', payStatus:'В обработке', originAddr:'пр. Машерова, 5', originCity:'Минск', originDate:iso(daysAgo(20)), originContact:'Игорь Захаров', originPhone:'+375 17 400-50-60', destAddr:'Пражская, 10', destCity:'Москва', destDate:iso(daysAgo(17)), destContact:'Андрей Волков', destPhone:'+7 900 123-45-67', shipper:'ОАО «МинскКристалл»', shipperPhone:'+375 17 555-60-70', driver:'Михаил Николаевич Дубровский', dispatcher:'Анна Ивановна Захарова', vehicles:[{make:'МАЗ-5440А9',year:'2020',type:'Тентованный',vin:'YOD5440A9P0001234',price:'1500'}], notes:'Претензия: повреждение части груза. Ждём решения страховой.', createdAt:fmt(daysAgo(21)) },
      { id:'10007', status:'Доставлен', cod:'560', payType:'Перевод', driverPay:'430', payStatus:'Оплачено', originAddr:'ул. Гагарина, 100', originCity:'Витебск', originDate:iso(daysAgo(5)), originContact:'Светлана Новикова', originPhone:'+375 212 60-00-00', destAddr:'ул. Советская, 50', destCity:'Могилёв', destDate:iso(daysAgo(4)), destContact:'Роман Степанов', destPhone:'+375 222 70-00-00', shipper:'ООО «Витебскэнерго»', shipperPhone:'+375 212 65-00-00', driver:'Алексей Петрович Семёнов', dispatcher:'Виктор Сергеевич Морозов', vehicles:[{make:'МАЗ-544008',year:'2022',type:'Бортовой',vin:'YOD5440082N0009876',price:'1600'}], notes:'Электрооборудование. Хрупкий груз.', createdAt:fmt(daysAgo(6)) },
      { id:'10008', status:'Новый', cod:'1800', payType:'Безналичный расчёт', driverPay:'1300', payStatus:'Не оплачено', originAddr:'Логистический центр «Северный»', originCity:'Минск', originDate:iso(daysAhead(5)), originContact:'Вадим Иванчук', originPhone:'+375 17 500-60-70', destAddr:'Hafen Strasse 10', destCity:'Берлин', destDate:iso(daysAhead(7)), destContact:'Klaus Fischer', destPhone:'+49 30 100 200 300', shipper:'ЗАО «МинскСтанкоИмпорт»', shipperPhone:'+375 17 600-70-80', driver:'', dispatcher:'Анна Ивановна Захарова', vehicles:[{make:'Volvo FH',year:'2019',type:'Тентованный',vin:'YV2RT40A9LA100001',price:'2800'}], notes:'Станки. Вес 18 тонн. CMR + сертификат ЕС. Нужен водитель с TIR.', createdAt:fmt(today) },
    ],
    deals: [
      { id:2001001, displayId:'20001', loadId:'10001', date:iso(daysAgo(8)), driver:'Иван Анатольевич Петров', dispatcher:'Анна Ивановна Захарова', origin:'Минск', dest:'Брест', cod:'850', driverPay:'650', status:'Оплачено' },
      { id:2001002, displayId:'20002', loadId:'10002', date:iso(daysAgo(12)), driver:'Сергей Владимирович Колесов', dispatcher:'Анна Ивановна Захарова', origin:'Минск', dest:'Варшава', cod:'1250', driverPay:'900', status:'Оплачено' },
      { id:2001003, displayId:'20003', loadId:'10003', date:iso(daysAgo(1)), driver:'Михаил Николаевич Дубровский', dispatcher:'Виктор Сергеевич Морозов', origin:'Гомель', dest:'Минск', cod:'620', driverPay:'480', status:'В обработке' },
      { id:2001004, displayId:'20004', loadId:'10004', date:iso(daysAhead(1)), driver:'Алексей Петрович Семёнов', dispatcher:'Анна Ивановна Захарова', origin:'Минск', dest:'Вильнюс', cod:'980', driverPay:'750', status:'Не оплачено' },
      { id:2001007, displayId:'20005', loadId:'10007', date:iso(daysAgo(5)), driver:'Алексей Петрович Семёнов', dispatcher:'Виктор Сергеевич Морозов', origin:'Витебск', dest:'Могилёв', cod:'560', driverPay:'430', status:'Оплачено' },
    ],
    staff: [
      { id:3001, name:'Захарова Анна Ивановна', initials:'АЗ', role:'Главный диспетчер', phone:'+375 17 100-20-30', email:'zakharova@mt.by', color:'#2563eb', status:'Активен', loads:22, createdAt:fmt(daysAgo(180)) },
      { id:3002, name:'Морозов Виктор Сергеевич', initials:'ВМ', role:'Диспетчер', phone:'+375 17 100-20-31', email:'morozov@mt.by', color:'#7c3aed', status:'Активен', loads:14, createdAt:fmt(daysAgo(90)) },
      { id:3003, name:'Ковалёва Марина Олеговна', initials:'КМ', role:'Диспетчер', phone:'+375 29 900-11-22', email:'kovaleva@mt.by', color:'#059669', status:'Активен', loads:8, createdAt:fmt(daysAgo(45)) },
    ],
    trucks: [
      { id:4001, name:'МАЗ-5440А9', year:'2020', vin:'YOD5440A9P0001234', plate:'1234 АВ-7', driver:'Иван Анатольевич Петров', mileage:'148 000 км', status:'Активен' },
      { id:4002, name:'МАЗ-6312В9', year:'2018', vin:'YOD6312V9J0002345', plate:'5678 МН-7', driver:'Михаил Николаевич Дубровский', mileage:'210 500 км', status:'Активен' },
      { id:4003, name:'Volvo FH 500', year:'2019', vin:'YV2RT40A9LA100001', plate:'9012 ВК-5', driver:'Сергей Владимирович Колесов', mileage:'178 300 км', status:'Активен' },
      { id:4004, name:'Mercedes Actros 1845', year:'2021', vin:'WDB9634031L000001', plate:'3456 ТА-6', driver:'Алексей Петрович Семёнов', mileage:'95 200 км', status:'Активен' },
      { id:4005, name:'МАЗ-544008', year:'2022', vin:'YOD5440082N0009876', plate:'7890 РС-7', driver:'', mileage:'42 000 км', status:'В ремонте' },
    ],
    trailers: [
      { id:5001, name:'Schmitz Cargobull', year:'2020', vin:'WSM00000001234567', plate:'АА 1001-7', status:'Активен' },
      { id:5002, name:'Kögel Cargo', year:'2019', vin:'W0L000001Z0000001', plate:'АА 2002-7', status:'Активен' },
      { id:5003, name:'МАЗ-975830', year:'2017', vin:'YOD9758302H0000001', plate:'АА 3003-7', status:'Неактивен' },
    ],
    documents: [
      { id:6001, title:'ТТН №БМ-0023451 (Минск–Брест)', type:'TTN', counterparty:'ОАО «Минскпродукт»', number:'БМ-0023451', dateIssue:iso(daysAgo(9)), dateExpiry:'', status:'Действующий', amount:'', mode:'freight', note:'К заказу #10001', createdAt:fmt(daysAgo(9)) },
      { id:6002, title:'CMR №0045 (Минск–Варшава)', type:'CMR', counterparty:'ООО «БелМашЭкспорт»', number:'0045', dateIssue:iso(daysAgo(14)), dateExpiry:'', status:'Действующий', amount:'', mode:'freight', note:'Рейс #10002, карнет МДП №BL-00123', createdAt:fmt(daysAgo(14)) },
      { id:6003, title:'Лицензия на перевозки №01234', type:'POA', counterparty:'Министерство транспорта РБ', number:'МТ-01234', dateIssue:'2022-03-01', dateExpiry:'2027-03-01', status:'Действующий', amount:'', mode:'freight', note:'Лицензия на автомобильные перевозки грузов', createdAt:fmt(daysAgo(300)) },
      { id:6004, title:'Договор с ООО «БелГрузТранс»', type:'CONTRACT', counterparty:'ООО «БелГрузТранс»', number:'2024/ДП-001', dateIssue:'2024-01-10', dateExpiry:'2024-12-31', status:'Действующий', amount:'', mode:'freight', note:'Рамочный договор на перевозки', createdAt:fmt(daysAgo(60)) },
      { id:6005, title:'Акт вып. работ №АВ-0056', type:'ACT', counterparty:'ОАО «МинскКристалл»', number:'АВ-0056', dateIssue:iso(daysAgo(20)), dateExpiry:'', status:'На подписании', amount:'1100', mode:'freight', note:'Акт по заказу #10006.', createdAt:fmt(daysAgo(20)) },
    ],
  };
}

export function initUserDemoData(userLogin) {
  const flag = `mt_demo_v2_${userLogin}`;
  if (localStorage.getItem(flag)) return;

  const prefix = `mt_u_${userLogin}_`;
  const data = makeData();

  Object.entries(data).forEach(([key, value]) => {
    localStorage.setItem(prefix + key, JSON.stringify(value));
  });

  localStorage.setItem(prefix + 'currency', 'BYN');
  localStorage.setItem(flag, '1');
  console.log(`[MT] Demo data initialized for user: ${userLogin}`);
}
