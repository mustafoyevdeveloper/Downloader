## Telegram bot: YouTube/Instagram video downloader (Node.js)

### O'rnatish

1) Bog'lamalarni o'rnating:

```bash
npm install
```

2) Muhit o'zgaruvchisini sozlang:

`.env` fayl yarating va `BOT_TOKEN` qiymatini kiriting:

```ini
BOT_TOKEN=123456789:YOUR_TELEGRAM_BOT_TOKEN
```

3) Botni ishga tushiring:

```bash
npm start
```

### Foydalanish

- `/start` yuboring yoki botga to'g'ridan to'g'ri Instagram yoki YouTube video havolasini yuboring.
- Bot video faylini qaytaradi (Telegram limitlariga mos sifatda).

### Eslatma

- YouTube uchun `ytdl-core` ishlatiladi; 360p/mp4 formatga ustuvorlik beriladi.
- Instagram uchun `instagram-url-direct` orqali to'g'ridan-to'g'ri video URL olinadi.
- Ba'zi Instagram havolalari (yopiq akkaunt, cheklovlar) yuklanmasligi mumkin.


# Downloader
