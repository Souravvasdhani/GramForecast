"""Products, Sales, Inventory, Alerts, Market routers."""

# ─── products.py content ──────────────────────────────────────────────────────
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import models
from database import get_db
from auth_utils import get_current_user

router = APIRouter()


class ProductCreate(BaseModel):
    name:          str
    category:      Optional[str] = None
    unit:          str = "kg"
    current_stock: float = 0
    ideal_stock:   Optional[float] = None
    safety_stock:  Optional[float] = None
    cost_price:    Optional[float] = None
    selling_price: Optional[float] = None


@router.get("/")
def list_products(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    products = (
        db.query(models.Product)
        .filter(models.Product.business_id == current_user.business_id)
        .all()
    )
    return [
        {
            "id":            str(p.id),
            "name":          p.name,
            "category":      p.category,
            "unit":          p.unit,
            "current_stock": float(p.current_stock or 0),
            "ideal_stock":   float(p.ideal_stock or 0),
            "safety_stock":  float(p.safety_stock or 0),
            "target_stock":  float(p.target_stock or 0),
            "cost_price":    float(p.cost_price or 0),
            "selling_price": float(p.selling_price or 0),
            "is_active":     p.is_active,
        }
        for p in products
    ]


@router.post("/")
def create_product(
    req: ProductCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = models.Product(
        business_id=current_user.business_id,
        **req.dict(),
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return {"id": str(product.id), "name": product.name}
