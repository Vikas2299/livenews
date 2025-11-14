from __future__ import annotations

import enum
from sqlalchemy.dialects.postgresql import ENUM


class LeaningEnum(str, enum.Enum):
    LEFT = "LEFT"
    CENTER = "CENTER"
    RIGHT = "RIGHT"


leaning_enum = ENUM(LeaningEnum, name="leaning_enum", create_type=True)