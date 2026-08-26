"""Graph response schemas."""
from typing import Any, Optional
from pydantic import BaseModel


class GraphNode(BaseModel):
    id: str
    type: str
    label: str
    risk: str = "unknown"
    data: dict = {}


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    relationship: str


class GraphResponse(BaseModel):
    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []
