"""
Centralized logging configuration for TrailPulse API.

使用方式：
    from app.logging import get_logger
    logger = get_logger(__name__)

    logger.info("hazard created", extra={"trail_id": "abc", "type": "flooding"})
    logger.warning("rate limit hit", extra={"ip": "1.2.3.4", "endpoint": "/api/auth/signin"})
    logger.exception("DB commit failed", extra={"trail_id": "abc"})  # 自动附加 stack trace

输出格式（JSON，生产环境可直接被 Datadog / Loki / CloudWatch 解析）：
    {
      "timestamp": "2026-03-01T07:00:00.123Z",
      "level": "INFO",
      "logger": "app.routers.hazards",
      "message": "hazard created",
      "trail_id": "abc",
      "type": "flooding"
    }

本地开发时输出可读的纯文本格式，生产环境（LOG_FORMAT=json）输出 JSON。
"""

import json
import logging
import sys
import traceback
from datetime import datetime, timezone


# ─── JSON Formatter ───────────────────────────────────────────

class JsonFormatter(logging.Formatter):
    """
    每条日志输出为单行 JSON，包含：
      timestamp, level, logger, message
    + 所有通过 extra={} 传入的业务字段
    + 如果有异常，附加 exc_type / exc_message / stack_trace
    """

    def format(self, record: logging.LogRecord) -> str:
        log: dict = {
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # 附加通过 extra={} 传入的业务字段（过滤掉 logging 内部字段）
        _LOGGING_INTERNAL_FIELDS = {
            "args", "created", "exc_info", "exc_text", "filename",
            "funcName", "levelname", "levelno", "lineno", "message",
            "module", "msecs", "msg", "name", "pathname", "process",
            "processName", "relativeCreated", "stack_info", "thread", "threadName",
        }
        for key, value in record.__dict__.items():
            if key not in _LOGGING_INTERNAL_FIELDS and not key.startswith("_"):
                log[key] = value

        # 附加异常信息
        if record.exc_info:
            exc_type, exc_value, exc_tb = record.exc_info
            log["exc_type"] = exc_type.__name__ if exc_type else None
            log["exc_message"] = str(exc_value) if exc_value else None
            log["stack_trace"] = traceback.format_exception(exc_type, exc_value, exc_tb)

        return json.dumps(log, default=str, ensure_ascii=False)


# ─── Text Formatter (本地开发) ────────────────────────────────

class DevFormatter(logging.Formatter):
    """
    本地开发时的可读格式：
      2026-03-01 07:00:00 INFO  app.routers.hazards | hazard created | trail_id=abc type=flooding
    """
    LEVEL_COLORS = {
        "DEBUG":    "\033[36m",   # cyan
        "INFO":     "\033[32m",   # green
        "WARNING":  "\033[33m",   # yellow
        "ERROR":    "\033[31m",   # red
        "CRITICAL": "\033[35m",   # magenta
    }
    RESET = "\033[0m"

    _SKIP = {
        "args", "created", "exc_info", "exc_text", "filename", "funcName",
        "levelname", "levelno", "lineno", "message", "module", "msecs",
        "msg", "name", "pathname", "process", "processName",
        "relativeCreated", "stack_info", "thread", "threadName",
    }

    def format(self, record: logging.LogRecord) -> str:
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        color = self.LEVEL_COLORS.get(record.levelname, "")
        level = f"{color}{record.levelname:<8}{self.RESET}"

        extras = {
            k: v for k, v in record.__dict__.items()
            if k not in self._SKIP and not k.startswith("_")
        }
        extra_str = "  " + "  ".join(f"{k}={v}" for k, v in extras.items()) if extras else ""

        line = f"{ts}  {level}  {record.name} | {record.getMessage()}{extra_str}"

        if record.exc_info:
            line += "\n" + self.formatException(record.exc_info)

        return line


# ─── Setup ────────────────────────────────────────────────────

def setup_logging(log_level: str = "INFO", log_format: str = "text") -> None:
    """
    应在应用启动时调用一次（main.py lifespan 或模块顶层）。

    Args:
        log_level:  "DEBUG" | "INFO" | "WARNING" | "ERROR"
        log_format: "json"（生产）或 "text"（本地开发）
    """
    formatter: logging.Formatter = (
        JsonFormatter() if log_format == "json" else DevFormatter()
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    # 配置根 logger
    root = logging.getLogger()
    root.setLevel(log_level.upper())
    root.handlers.clear()
    root.addHandler(handler)

    # 压制第三方库的噪声日志
    for noisy in ("uvicorn.access", "sqlalchemy.engine", "httpx", "httpcore"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """
    在每个模块顶部调用：
        logger = get_logger(__name__)
    """
    return logging.getLogger(name)
