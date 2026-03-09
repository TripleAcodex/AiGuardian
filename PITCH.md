# PITCH SCRIPT — AI Guardian
> Читай только заголовки. Детали — если нужно вспомнить.

---

## 1. ОТКРЫТИЕ (говори это первым, 20 сек)

> "We built an AI-powered surveillance system that detects violence in real time —
> under one second, no faces stored, runs on any laptop."

Пауза. Смотришь на судей.

> "Let me show you."

→ Сразу открываешь демо.

---

## 2. ДЕМО (3 минуты — главное)

1. Открой Dashboard → Upload видео
2. **"These are skeleton keypoints — 17 joints per person. No face, just geometry."**
3. Confidence растёт → **"Watch the score..."**
4. Алерт → **"Alert fired."**
5. Показываешь телеграм на телефоне → **"Instant Telegram notification."**

---

## 3. КАК РАБОТАЕТ (1 мин, после демо)

**Шаг 1 — YOLO11**
> "YOLO detects 17 body points per person — shoulders, elbows, wrists, knees."

**Шаг 2 — Граф (математика)**
> "We model the body as a graph. G = (V, E). 17 joints = vertices. Bones = edges.
> This is graph theory applied to human anatomy."

**Шаг 3 — Физика**
> "We compute wrist velocity: v = (x now − x previous) / time.
> If a hand moves fast toward another person — that's an attack vector.
> Symmetric slow motion — that's a hug."

**Шаг 4 — Нейросеть**
> "A graph neural network processes 30 frames of skeleton data and outputs
> one number: probability of violence."

---

## 4. РЕЗУЛЬТАТЫ (30 сек)

- F1-score: **0.943**
- Accuracy: **96.9%**
- Alert: **< 1 second**
- Faces stored: **zero**
- Runs on: **CPU, any webcam**

---
 
## 5. ЗАКРЫТИЕ (10 сек)

> "AI-powered, privacy-first, real-time. That's AI Guardian."

---

---

# Q&A — ОТВЕТЫ (учи эти, они точно спросят)

**"Откуда формулы?"**
> "Graph convolution — Kipf & Welling, ICLR 2017.
> Skeleton graphs for action recognition — ST-GCN, AAAI 2018.
> We applied it to violence detection."

**"Как обучали?"**
> "NTU RGB+D dataset — 56,000 clips, 60 action classes. Standard benchmark.
> Fine-tuned on 32 real fight videos. Kaggle P100 GPU, 35 epochs."

**"Почему не face recognition?"**
> "Privacy law. We store only x,y coordinates — geometry, not identity. Zero biometric data."

**"Задержка 1 секунда — не слишком долго?"**
> "Human reaction time is 1–3 seconds. We confirm over 2 consecutive frames to avoid false alarms — that adds 0.1s. Total under 1 second end-to-end."

**"Что если обнимаются?"**
> "Hugs produce symmetric, low-speed vectors. Attacks produce asymmetric vectors — one hand accelerates toward the other person. The system measures direction, not just speed."

**"Что пробовали до этого?"**
> "3D CNNs on optical flow — too slow for real-time without GPU.
> Skeleton GCN gave best accuracy-to-latency ratio and runs on CPU."

**"Где ошибается?"**
> "False positives: vigorous dancing close together.
> False negatives: very slow deliberate contact below speed threshold.
> Not a replacement for humans — reduces their workload."

**"Почему граф, а не обычный CNN?"**
> "CNN doesn't know anatomy. Our graph explicitly encodes that a wrist connects to an elbow, not a knee. Every weight has physical meaning."

---

# ЕСЛИ ДЕМО НЕ ЗАПУСТИЛОСЬ

> "Let me show the pre-recorded demonstration."

Открой заранее записанное видео экрана.

---

# ЗА 30 МИН ДО

- `python main.py` запущен
- Браузер открыт на Dashboard
- Видео с братом готово к загрузке
- Telegram бот активен
- Телефон заряжен, видно уведомление
