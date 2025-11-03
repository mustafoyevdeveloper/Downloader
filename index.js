require('dotenv').config();
const { Telegraf } = require('telegraf');
const ytdl = require('@distube/ytdl-core');
const instagramModule = require('instagram-url-direct');
const instagramGetUrl = (instagramModule && (instagramModule.default || instagramModule.instagramGetUrl || instagramModule.getInfo || instagramModule));
const fs = require('fs');
const path = require('path');
const tmp = require('tmp');
const axios = require('axios');

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
	console.error('BOT_TOKEN topilmadi. Iltimos .env faylida BOT_TOKEN=... sifatida belgilang.');
	process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

const urlRegex = /(https?:\/\/[^\s]+)/i;

bot.start(async (ctx) => {
	await ctx.reply(
		`

🎬 Everest - Downloader 🚀
YouTube va Instagram’dan videolarni bir zumda yuklab oling! 🔥
✅ Afzalliklar:
🔹 HD sifatda video yuklash
🔹 Tezkor va qulay ishlash ⚡️
🔹 Hech qanday qo‘shimcha dastur kerak emas
🚀 Hoziroq link yuboring — video bir necha soniyada tayyor!
Variant 2
📥 Everest Video Bot 🎯
YouTube va Instagram videolarini bevosita Telegram ichida yuklang! 💡
✅ Nimalar qila oladi:
🔹 Yuqori sifatli (HD) video
🔹 Tez va ishonchli xizmat ⚡️
🔹 Link yuboring — qolganini bot bajaradi
🚀 Hozir sinab ko‘ring!
Variant 3
🎞️ Everest Downloader 🤖
Instagram va YouTube’dan istalgan videoni oson yuklab oling! ✨
✅ Xususiyatlar:
🔹 HD formatda yuklash
🔹 Tezkor ishlash va soddalik
🔹 Hech qanday sozlash talab qilinmaydi
🚀 Video linkini yuboring — bot sizga tayyor faylni qaytaradi!

Yangi loyihalar, foydali kontent va yangiliklardan xabardor bo‘lish uchun rasmiy kanal va guruhimizga obuna bo‘ling.

`
		,
		{
			disable_web_page_preview: true,
			reply_markup: {
				inline_keyboard: [
					[
						{ text: '📢  EVEREST • EVOLUTION', url: 'https://t.me/everestevolution' },
						{ text: '💬  Everest Evolution group', url: 'https://t.me/everestevolutiongroup' }
					]
				]
			}
		}
	);
});

bot.on('text', async (ctx) => {
	try {
		const text = ctx.message.text || '';
		const match = text.match(urlRegex);
		if (!match) {
			return ctx.reply("Iltimos, Instagram yoki YouTube video linkini yuboring.");
		}
		const url = match[0];
		const originalMessageId = ctx.message.message_id;
		if (isYouTubeUrl(url)) {
			await handleYouTube(ctx, url, originalMessageId);
			return;
		}
		if (isInstagramUrl(url)) {
			await handleInstagram(ctx, url, originalMessageId);
			return;
		}
		return ctx.reply("Qo'llab-quvvatlanadigan manbalar: YouTube va Instagram.");
	} catch (err) {
		console.error(err);
		return ctx.reply("Xatolik yuz berdi. Keyinroq yana urinib ko'ring.");
	}
});

function isYouTubeUrl(url) {
	return /(youtube\.com|youtu\.be)/i.test(url);
}

function isInstagramUrl(url) {
	return /instagram\.com/i.test(url);
}

function extractYouTubeId(url) {
	const m = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:[^0-9A-Za-z_-]|$)/);
	return m ? m[1] : null;
}

async function getPipedMuxedMp4Url(videoId) {
	try {
		const apiUrl = `https://piped.video/api/v1/streams/${videoId}`;
		const res = await axios.get(apiUrl, { headers: { 'accept-language': 'en-US,en;q=0.9' } });
		const data = res.data;
		const streams = data && (data.formatStreams || data.videoStreams || []);
		if (Array.isArray(streams)) {
			const mp4 = streams.find((s) => s && s.url && /mp4/i.test(s.mimeType || s.type || '') ) || streams[0];
			return mp4 && mp4.url ? mp4.url : null;
		}
		return null;
	} catch (_) {
		return null;
	}
}

async function handleYouTube(ctx, url, originalMessageId) {
    const statusMsg = await ctx.reply("YouTube videoni yuklab olyapman 🔎…");
    try {
		const tmpFile = tmp.fileSync({ prefix: 'yt_', postfix: '.mp4' });
		let downloaded = false;
		// 1) Asosiy usul: ytdl oqim
		try {
			const ytdlOptions = {
				quality: 18,
				filter: 'audioandvideo',
				requestOptions: {
					headers: {
						'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
						'accept-language': 'en-US,en;q=0.9',
						'referer': 'https://www.youtube.com/'
					}
				},
				dlChunkSize: 0,
				highWaterMark: 1 << 25
			};
			await new Promise((resolve, reject) => {
				const writeStream = fs.createWriteStream(tmpFile.name);
				ytdl(url, ytdlOptions)
					.on('error', reject)
					.pipe(writeStream)
					.on('error', reject)
					.on('finish', resolve);
			});
			downloaded = true;
		} catch (_) {}

		// 2) Zaxira: Piped API orqali to'g'ridan-to'g'ri mp4 oqim URL olib yuklash
		if (!downloaded) {
			const videoId = extractYouTubeId(url);
			const mp4Url = videoId ? await getPipedMuxedMp4Url(videoId) : null;
			if (!mp4Url) throw new Error('Fallback mp4 URL topilmadi');
			await new Promise(async (resolve, reject) => {
				try {
					const response = await axios.get(mp4Url, {
						responseType: 'stream',
						headers: {
							'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
							'referer': 'https://piped.video/'
						}
					});
					const writer = fs.createWriteStream(tmpFile.name);
					response.data.pipe(writer);
					writer.on('finish', resolve);
					writer.on('error', reject);
				} catch (err) {
					reject(err);
				}
			});
		}

        await ctx.replyWithVideo(
			{ source: fs.createReadStream(tmpFile.name), filename: `video.mp4` },
			{
				caption: "Everest - Downloader boti videoni YouTube dan muvaffaqiyatli yuklab oldi ✅",
				reply_markup: {
					inline_keyboard: [
						[
							{ text: '🤖 Downloader bot', url: 'https://t.me/downloader_youtube_i_bot' }
						]
					]
				}
			}
		);
		try { fs.unlinkSync(tmpFile.name); } catch (_) {}
		try { if (originalMessageId) await ctx.deleteMessage(originalMessageId); } catch (_) {}
        try { await ctx.deleteMessage(statusMsg.message_id); } catch (_) {}
	} catch (e) {
		console.error('YouTube xatosi:', e);
		await ctx.reply("YouTube videoni yuklab bo'lmadi. Havolani tekshirib qayta yuboring.");
		try { if (originalMessageId) await ctx.deleteMessage(originalMessageId); } catch (_) {}
        try { await ctx.deleteMessage(statusMsg.message_id); } catch (_) {}
	}
}

async function handleInstagram(ctx, url, originalMessageId) {
    const statusMsg = await ctx.reply("Instagram videoni yuklab olyapman 🔎…");
    try {
        const result = await instagramGetUrl(url);
        // Kutilyotgan shakllar: { url_list: [...] } yoki array/object
        let directUrl = null;
        if (result && Array.isArray(result.url_list) && result.url_list.length > 0) {
            directUrl = result.url_list.find((u) => /\.mp4(\?|$)/i.test(u)) || result.url_list[0];
        } else if (Array.isArray(result)) {
            const m = result.find((m) => m && m.url) || result[0];
            directUrl = m && (m.url || m);
        } else if (result && typeof result === 'object' && result.url) {
            directUrl = result.url;
        }

        if (!directUrl) {
            await ctx.reply("Video havolasi topilmadi. Iltimos, to'g'ridan-to'g'ri post reels/video havolasini yuboring.");
            return;
        }

        // Instagram CDN URL'ini avval vaqtinchalik faylga yuklab, keyin fayl sifatida yuboramiz
        const tmpFile = tmp.fileSync({ prefix: 'ig_', postfix: '.mp4' });
        await new Promise(async (resolve, reject) => {
            try {
                const response = await axios.get(directUrl, {
                    responseType: 'stream',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
                    }
                });
                const writer = fs.createWriteStream(tmpFile.name);
                response.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
            } catch (err) {
                reject(err);
            }
        });

		await ctx.replyWithVideo(
			{ source: fs.createReadStream(tmpFile.name), filename: 'instagram.mp4' },
			{
				caption: "Everest - Downloader boti videoni Instagram dan muvaffaqiyatli yuklab oldi ✅",
				reply_markup: {
					inline_keyboard: [
						[
							{ text: '🤖 Downloader bot', url: 'https://t.me/downloader_youtube_i_bot' }
						]
					]
				}
			}
		);
        try { fs.unlinkSync(tmpFile.name); } catch (_) {}
        try { if (originalMessageId) await ctx.deleteMessage(originalMessageId); } catch (_) {}
        try { await ctx.deleteMessage(statusMsg.message_id); } catch (_) {}
    } catch (e) {
        console.error('Instagram xatosi:', e);
        await ctx.reply("Instagram videoni olishda xatolik. Ehtimol, havola yopiq yoki qo'llab-quvvatlanmaydi.");
        try { if (originalMessageId) await ctx.deleteMessage(originalMessageId); } catch (_) {}
        try { await ctx.deleteMessage(statusMsg.message_id); } catch (_) {}
    }
}

bot.launch()
	.then(() => console.log('Bot ishga tushdi.'))
	.catch((e) => console.error('Botni ishga tushirishda xatolik:', e));

// Graceful stop (Render/Heroku va h.k. uchun)
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));


