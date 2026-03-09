"""
AI Guardian — Telegram Bot (Aiogram 3, polling)
Inline кнопки, уведомления об инцидентах
"""

import asyncio
import os
from aiogram import Bot, Dispatcher, Router, F
from aiogram.types import (
    Message, CallbackQuery, FSInputFile,
    InlineKeyboardMarkup, InlineKeyboardButton
)
from aiogram.filters import Command
from aiogram.enums import ParseMode

router = Router()

# Глобальные ссылки — заполняются из main.py
_bot: Bot | None = None
_chat_id: str = ""
_get_stats = None       # callable -> dict
_get_screenshot = None   # callable -> str|None  (path)
_set_threshold = None    # callable(float)
_save_config = None      # callable(key, value)
_muted = False


def _main_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="📸 Скриншот", callback_data="screenshot"),
            InlineKeyboardButton(text="📊 Статистика", callback_data="stats"),
        ],
        [
            InlineKeyboardButton(text="🔼 Порог +5%", callback_data="thresh_up"),
            InlineKeyboardButton(text="🔽 Порог -5%", callback_data="thresh_down"),
        ],
        [
            InlineKeyboardButton(text="🔕 Mute" if not _muted else "🔔 Unmute",
                                 callback_data="toggle_mute"),
        ],
    ])


@router.message(Command("start"))
async def cmd_start(msg: Message):
    global _chat_id
    new_chat_id = str(msg.chat.id)

    # Auto-save the chat ID so users don't need to configure it manually
    if new_chat_id != _chat_id:
        _chat_id = new_chat_id
        if _save_config:
            _save_config("telegram_chat_id", new_chat_id)

    await msg.answer(
        "🛡️ <b>AI Guardian v2.0</b>\n\n"
        "✅ Connected! You will receive alerts here.\n"
        "Используйте кнопки ниже:",
        parse_mode=ParseMode.HTML,
        reply_markup=_main_kb()
    )


@router.message(Command("status"))
async def cmd_status(msg: Message):
    if _get_stats:
        s = _get_stats()
        text = (
            f"🛡️ <b>AI Guardian Status</b>\n\n"
            f"{'🔴' if s['is_violence'] else '🟢'} "
            f"{'ALERT' if s['is_violence'] else 'Normal'}\n"
            f"📊 Confidence: {s['confidence']:.1%}\n"
            f"👥 People: {s['person_count']}\n"
            f"⚡ Motion: {s['motion_speed']}\n"
            f"🎯 Threshold: {s['threshold']:.0%}\n"
            f"🎥 FPS: {s['fps']}\n"
            f"🚨 Incidents: {s['total_incidents']}\n"
            f"🔕 Muted: {'Yes' if _muted else 'No'}"
        )
    else:
        text = "⏹️ Детектор не запущен"
    await msg.answer(text, parse_mode=ParseMode.HTML, reply_markup=_main_kb())


@router.callback_query(F.data == "stats")
async def cb_stats(cb: CallbackQuery):
    if _get_stats:
        s = _get_stats()
        text = (
            f"📊 <b>Статистика</b>\n\n"
            f"{'🔴' if s['is_violence'] else '🟢'} "
            f"{'ALERT' if s['is_violence'] else 'Normal'}\n"
            f"Confidence: {s['confidence']:.1%}\n"
            f"People: {s['person_count']}  |  FPS: {s['fps']}\n"
            f"Motion: {s['motion_speed']}  |  Threshold: {s['threshold']:.0%}\n"
            f"Incidents: {s['total_incidents']}\n"
            f"Reason: {s['reason']}"
        )
    else:
        text = "⏹️ Детектор не запущен"
    await cb.message.edit_text(text, parse_mode=ParseMode.HTML, reply_markup=_main_kb())
    await cb.answer()


@router.callback_query(F.data == "screenshot")
async def cb_screenshot(cb: CallbackQuery):
    await cb.answer("📸 Делаю скриншот...")
    if _get_screenshot:
        path = _get_screenshot()
        if path and os.path.exists(path):
            await cb.message.answer_photo(
                FSInputFile(path),
                caption="📸 Live screenshot",
                reply_markup=_main_kb()
            )
            try:
                os.remove(path)
            except (FileNotFoundError, PermissionError):
                pass
            return
    await cb.message.answer("❌ Не удалось сделать скриншот", reply_markup=_main_kb())


@router.callback_query(F.data == "thresh_up")
async def cb_thresh_up(cb: CallbackQuery):
    if _get_stats and _set_threshold:
        cur = _get_stats()['threshold']
        new = min(0.9, cur + 0.05)
        _set_threshold(new)
        await cb.answer(f"🎯 Порог: {new:.0%}")
        await cb.message.edit_text(
            f"🎯 Порог установлен: <b>{new:.0%}</b>",
            parse_mode=ParseMode.HTML, reply_markup=_main_kb()
        )
    else:
        await cb.answer("Детектор не запущен")


@router.callback_query(F.data == "thresh_down")
async def cb_thresh_down(cb: CallbackQuery):
    if _get_stats and _set_threshold:
        cur = _get_stats()['threshold']
        new = max(0.3, cur - 0.05)
        _set_threshold(new)
        await cb.answer(f"🎯 Порог: {new:.0%}")
        await cb.message.edit_text(
            f"🎯 Порог установлен: <b>{new:.0%}</b>",
            parse_mode=ParseMode.HTML, reply_markup=_main_kb()
        )
    else:
        await cb.answer("Детектор не запущен")


@router.callback_query(F.data == "toggle_mute")
async def cb_mute(cb: CallbackQuery):
    global _muted
    _muted = not _muted
    status = "🔕 Уведомления выключены" if _muted else "🔔 Уведомления включены"
    await cb.answer(status)
    await cb.message.edit_text(status, reply_markup=_main_kb())


# ── send alert (called from detector thread) ───────

async def _send_alert_async(image_path: str, confidence: float, stats: dict):
    global _muted, _bot, _chat_id
    if _muted or not _bot or not _chat_id:
        return
    try:
        text = (
            f"🚨 <b>БУЛЛИНГ ОБНАРУЖЕН!</b>\n\n"
            f"📊 Уверенность: {confidence:.1%}\n"
            f"👥 Людей: {stats.get('person_count', 0)}\n"
            f"⚡ Скорость: {stats.get('motion_speed', 0):.1f}\n"
            f"⏰ {stats.get('timestamp', '')}\n"
            f"🎥 Инцидент #{stats.get('total_incidents', 0)}"
        )
        if os.path.exists(image_path):
            await _bot.send_photo(
                chat_id=_chat_id,
                photo=FSInputFile(image_path),
                caption=text,
                parse_mode=ParseMode.HTML,
                reply_markup=_main_kb()
            )
    except Exception as e:
        print(f"Telegram alert error: {e}")


def send_alert(image_path: str, confidence: float, stats: dict):
    """Thread-safe: called from detector thread"""
    if _muted or not _bot or not _bot_loop:
        return
    asyncio.run_coroutine_threadsafe(
        _send_alert_async(image_path, confidence, stats),
        _bot_loop
    )


# ── lifecycle ───────────────────────────────────────

_dp = Dispatcher()
_dp.include_router(router)
_bot_loop: asyncio.AbstractEventLoop | None = None


async def start_bot(token: str, chat_id: str,
                    get_stats=None, get_screenshot=None, set_threshold=None,
                    save_config=None):
    global _bot, _chat_id, _get_stats, _get_screenshot, _set_threshold, _save_config, _bot_loop

    _chat_id = chat_id
    _get_stats = get_stats
    _get_screenshot = get_screenshot
    _set_threshold = set_threshold
    _save_config = save_config
    _bot_loop = asyncio.get_event_loop()

    _bot = Bot(token=token)

    await _dp.start_polling(_bot)


async def stop_bot():
    global _bot
    if _bot:
        await _bot.session.close()
        _bot = None


async def send_test_message() -> bool:
    """Send a test message to verify bot connection."""
    if not _bot or not _chat_id:
        return False
    try:
        await _bot.send_message(
            chat_id=_chat_id,
            text="🧪 <b>AI Guardian — Test Alert</b>\n\n"
                 "✅ Telegram connection is working!\n"
                 "📌 You will receive alerts here when violence is detected.",
            parse_mode=ParseMode.HTML
        )
        return True
    except Exception as e:
        print(f"Test message error: {e}")
        return False


async def get_bot_info() -> dict:
    """Get bot username and connection status."""
    if not _bot:
        return {"connected": False, "username": ""}
    try:
        me = await _bot.get_me()
        return {"connected": bool(_chat_id), "username": me.username or ""}
    except Exception:
        return {"connected": bool(_chat_id), "username": ""}