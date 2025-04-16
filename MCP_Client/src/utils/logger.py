import logging
import os
import sys
from logging.handlers import RotatingFileHandler

# 确保日志目录存在 - 使用相对于当前文件的路径计算
current_dir = os.path.dirname(os.path.abspath(__file__))
base_dir = os.path.dirname(os.path.dirname(current_dir))
log_dir = os.path.join(base_dir, 'logs')
os.makedirs(log_dir, exist_ok=True)

# 配置日志格式
LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()
LOG_FILE = os.path.join(log_dir, 'mcp_client.log')

# 创建logger
logger = logging.getLogger('mcp_client')
logger.setLevel(getattr(logging, LOG_LEVEL))

# 控制台日志处理器
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(logging.Formatter(LOG_FORMAT))
logger.addHandler(console_handler)

# 文件日志处理器（使用循环日志文件，最大10MB，保留5个备份）
file_handler = RotatingFileHandler(
    LOG_FILE, 
    maxBytes=10*1024*1024,  # 10MB
    backupCount=5, 
    encoding='utf-8'
)
file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
logger.addHandler(file_handler)

def get_logger():
    """获取logger实例"""
    return logger

# 简便函数，封装常用的日志级别
def debug(message, *args, **kwargs):
    logger.debug(message, *args, **kwargs)

def info(message, *args, **kwargs):
    logger.info(message, *args, **kwargs)

def warning(message, *args, **kwargs):
    logger.warning(message, *args, **kwargs)

def error(message, *args, **kwargs):
    logger.error(message, *args, **kwargs)

def critical(message, *args, **kwargs):
    logger.critical(message, *args, **kwargs) 