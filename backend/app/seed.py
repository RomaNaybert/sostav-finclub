from sqlalchemy import select

from .models import Publication, User
from .security import passwords


def seed(db):
    if db.scalar(select(User.id).limit(1)):
        return
    maria = User(
        email="maria@demo.local",
        password_hash=passwords.hash("Demo2026!"),
        name="Мария Волкова",
        bio="Учусь в ВШЭ. Люблю превращать идеи в продукты и ищу команду, с которой можно сделать что-то полезное.",
        skills="Product design, Figma, Исследования",
        telegram="maria_sostav",
        avatar="maria",
    )
    alex = User(
        email="alex@demo.local",
        password_hash=passwords.hash("Demo2026!"),
        name="Алексей Козлов",
        bio="Собираю Finflow. Интересуюсь финтехом, Python и продуктовой разработкой.",
        skills="Python, Финансы, Product",
        telegram="alex_sostav",
        avatar="alex",
    )
    db.add_all([maria, alex])
    db.flush()
    rows = [
        (
            alex,
            "startup",
            "Finflow",
            "Ищем тех, кто изменит финтех.",
            "Развиваем продукт для управления личными и совместными финансами. Ищем сооснователя с продуктовым мышлением и желанием строить вместе.",
            "Python, Product design",
            "Доля в проекте, работа над MVP",
        ),
        (
            maria,
            "vacancy",
            "Nota",
            "Продуктовый дизайнер в EdTech",
            "Ищем продуктового дизайнера, который поможет переосмыслить опыт студентов в образовательной платформе. Важно чувство структуры, самостоятельность и интерес к образовательным продуктам.",
            "Продуктовый дизайн, Figma",
            "От 25 000 ₽ / месяц",
        ),
        (
            alex,
            "startup",
            "Круг",
            "Кофе, который объединяет.",
            "Создаём сеть кофе-точек на кампусе ВШЭ — про людей, идеи и разговоры. Ищем единомышленников в команду: маркетинг, операционка, продукт. Любовь к кофе обязательна.",
            "Маркетинг, Операции",
            "Доля в проекте",
        ),
        (
            maria,
            "vacancy",
            "Orbit",
            "Frontend-разработчик",
            "Ищем frontend-разработчика для развивающегося EdTech-продукта. Нужен опыт с React, аккуратность в вёрстке и желание делать удобные и понятные интерфейсы вместе с нами.",
            "React, TypeScript",
            "От 40 000 ₽ / месяц",
        ),
    ]
    for i, (owner, kind, project, title, description, roles, reward) in enumerate(rows):
        db.add(
            Publication(
                owner_id=owner.id,
                request_id=f"00000000-0000-4000-8000-{i:012d}",
                kind=kind,
                project=project,
                title=title,
                description=description,
                roles=roles,
                commitment="5–10 ч / неделю",
                location="Удалённо" if i != 2 else "Москва, кампус ВШЭ",
                reward=reward,
            )
        )
    db.commit()
