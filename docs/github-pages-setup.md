# GitHub Pages (preview после push в master)

Постоянный URL после успешного деплоя:

`https://alexdiz88.github.io/SoulSplit/`

(имя сегмента пути совпадает с именем репозитория на GitHub.)

Локально по-прежнему `npm run dev` с корнем `/`. Для проверки production-сборки как на Pages:

```bash
VITE_BASE_PATH=/SoulSplit/ npm run build && npm run preview
```

## Что сделать один раз в GitHub (репозиторий приватный)

### 1. Тариф и доступность Pages

На **бесплатном** GitHub Pages для **приватного** репозитория **нет**.

Варианты:

- **GitHub Pro** (или Team/Enterprise): Pages из приватного репо доступны; видимость сайта настраивается отдельно (публичный или только для авторизованных).
- Сделать репозиторий **публичным** - Pages на Free заработают без Pro.

Без одного из этих шагов workflow будет собираться, но раздел Pages не опубликует сайт.

### 2. Включить GitHub Actions (если выключены)

1. Репозиторий **SoulSplit** → **Settings** → **Actions** → **General**.
2. **Actions permissions**: Allow all actions and reusable workflows (или разрешить только actions от GitHub).
3. **Workflow permissions**: можно оставить **Read repository contents** - в workflow уже прописаны `pages: write` и `id-token: write`.

### 3. Источник GitHub Pages = GitHub Actions

1. **Settings** → **Pages**.
2. **Build and deployment** → **Source**: выбрать **GitHub Actions** (не Deploy from a branch).

До первого успешного workflow здесь может быть пусто - это нормально.

### 4. Видимость сайта (Pro / приватный репо)

На **Settings** → **Pages** при наличии Pro:

- **Public** - ссылку может открыть любой (удобно для preview с телефона).
- **Private** - только пользователи с доступом к репозиторию.

### 5. Первый деплой

1. Смержить изменения с workflow в **master** (или push напрямую в master).
2. Вкладка **Actions** → workflow **Deploy GitHub Pages** → дождаться зелёной галочки.
3. **Settings** → **Pages** - появится URL; тот же URL в summary job **deploy** (environment **github-pages**).

Дальше каждый push в **master** пересобирает и обновляет сайт (обычно 2-5 минут).

## Если что-то пошло не так

| Симптом | Что проверить |
|--------|----------------|
| Workflow красный на `npm run build` | Лог job **build**; локально `npm ci && npm run build`. |
| Build ок, deploy падает | **Settings** → **Pages** → Source = **GitHub Actions**; тариф для приватного репо. |
| Белый экран / нет картинок | Открывать именно URL с `/SoulSplit/` в конце пути, не корень `github.io`. |
| 404 на deep links | У SPA один `index.html`; для игры с одной точкой входа этого достаточно. |

## От вас не требуется

- Отдельная ветка `gh-pages`.
- Ручной upload в Pages.
- Туннели для «постоянного» preview после merge в master.
