// Принимает заявку с сайта и пересылает её в Telegram.
// Нужны переменные окружения в Vercel: TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID.
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    res.status(500).json({ ok: false, error: 'not_configured' });
    return;
  }
  let b = req.body || {};
  if (typeof b === 'string') {
    try { b = JSON.parse(b); } catch (e) { b = {}; }
  }
  if (b.website) { // ловушка для спам-ботов
    res.status(200).json({ ok: true });
    return;
  }
  const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max || 400);
  const list = (v) => (Array.isArray(v) ? v : []).map((x) => clean(x, 120)).filter(Boolean);
  const name = clean(b.name, 100);
  const phone = clean(b.phone, 40);
  if (!name || phone.replace(/\D/g, '').length < 6) {
    res.status(400).json({ ok: false, error: 'invalid' });
    return;
  }
  const rows = [
    ['Имя', name],
    ['Телефон', phone],
    ['Где удобнее общаться', clean(b.method, 40)],
    ['Хочет передать', list(b.areas).join(', ')],
    ['Другое', clean(b.other)],
    ['Задачи из каталога', list(b.tasks).join('; ')],
    ['Своя задача из каталога', clean(b.tasksOther)],
    ['Время на задачи в неделю', clean(b.hours, 60)],
    ['Когда нужен ассистент', clean(b.when, 60)],
    ['Кто', clean(b.role, 60)],
    ['Подходящий тариф', clean(b.rec, 80)],
    ['Версия сайта', b.version === 'mobile' ? 'мобильная' : 'полная']
  ].filter((r) => r[1]);
  const text = ('Новая заявка с сайта\n\n' + rows.map((r) => r[0] + ': ' + r[1]).join('\n')).slice(0, 4000);
  try {
    const tg = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text, disable_web_page_preview: true })
    });
    const data = await tg.json();
    if (!data.ok) {
      res.status(502).json({ ok: false, error: 'telegram' });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(502).json({ ok: false, error: 'network' });
  }
};
