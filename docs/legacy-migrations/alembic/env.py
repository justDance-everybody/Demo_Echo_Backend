import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# 添加项目根目录到 Python 路径，以便导入 app 模块
# 获取 env.py 所在的 alembic 目录
alembic_dir = os.path.dirname(__file__)
# 获取 backend 目录 (alembic 目录的上级目录)
project_dir = os.path.abspath(os.path.join(alembic_dir, '..'))
if project_dir not in sys.path:
    sys.path.append(project_dir)

# 导入我们的 Base 模型和配置
from app.utils.db import Base
from app.config import settings

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = Base.metadata # 指向我们导入的 Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:-
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    # url = config.get_main_option("sqlalchemy.url") # 使用 ini 文件中的 url
    url = settings.DATABASE_URL # 直接使用 settings 中的 URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # 使用 settings 中的 URL 来创建引擎
    connectable = engine_from_config(
        # config.get_section(config.config_main_section, {}),
        {"sqlalchemy.url": settings.DATABASE_URL}, # 覆盖 ini 文件设置，确保使用 settings
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
