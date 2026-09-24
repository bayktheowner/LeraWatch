LeraWatch v0.5.4 POINTER FIX

Найдена конкретная причина:
невидимое закрытое модальное окно detailModal перекрывало весь экран
из-за CSS-правила, которое принудительно ставило pointer-events:auto.

Исправление:
удалено ошибочное правило
.detail-modal,.detail-sheet,.detail-sheet * { pointer-events:auto }

Теперь штатные правила снова работают:
- закрытая .detail-modal -> pointer-events:none
- открытая .detail-modal.open -> pointer-events:auto

Сохранены:
- поиск
- навигация
- карточки
- Хочу / Просмотрено
- Где посмотреть
- регион RU

Файлы лежат прямо в корне ZIP и имеют обычные имена.
