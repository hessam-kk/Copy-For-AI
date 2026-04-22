"""Sample file for testing copy-fn-signatures."""

import math
from dataclasses import dataclass


@dataclass
class Point:
    x: float
    y: float

    def distance(self,
                 other: "Point") -> float:
        return math.hypot(self.x - other.x, self.y - other.y)

    @staticmethod
    def origin() -> "Point":
        return Point(0.0, 0.0)

    @classmethod
    def from_polar(cls, r: float, theta: float) -> "Point":
        return cls(r * math.cos(theta), r * math.sin(theta))


def area_of_circle(radius: float) -> float:
    return math.pi * radius ** 2


def wrap(value, default=lambda: None):
    return default() if value is None else value
