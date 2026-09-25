from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional


# ---- Auth ----
class RegisterReq(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    phone: str = Field(min_length=6, max_length=20)
    password: str = Field(min_length=6, max_length=128)


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class FacebookAuthReq(BaseModel):
    code: str
    redirect_uri: str


class ChangePasswordReq(BaseModel):
    old_password: str = ""
    new_password: str = Field(min_length=6, max_length=128)


class ForgotPasswordReq(BaseModel):
    email: EmailStr


class ResetPasswordReq(BaseModel):
    token: str = Field(min_length=1)
    new_password: str = Field(min_length=6, max_length=128)


# ---- Categories ----
class CategoryReq(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    sort_order: int = 0
    enabled: bool = True


# ---- Menu items ----
class CustomizationOption(BaseModel):
    name: str
    price_adjust: float = 0.0


class CustomizationGroup(BaseModel):
    group_name: str
    required: bool = False
    multi: bool = False
    options: List[CustomizationOption] = []


class MenuItemReq(BaseModel):
    category_id: str
    name: str = Field(min_length=1, max_length=100)
    description: str = ""
    price: float = Field(ge=0)
    discount: float = Field(default=0, ge=0)
    tax_percent: float = Field(default=0, ge=0)
    image: str = ""
    is_veg: bool = True
    prep_time: int = Field(default=20, ge=0)
    available: bool = True
    featured: bool = False
    sort_order: int = 0
    tags: List[str] = []
    customizations: List[CustomizationGroup] = []


class AvailabilityReq(BaseModel):
    available: bool


# ---- Cart ----
class SelectedCustomization(BaseModel):
    group_name: str
    option_name: str


class CartItemReq(BaseModel):
    menu_item_id: str
    quantity: int = Field(ge=1, le=50)
    customizations: List[SelectedCustomization] = []


class CartQtyReq(BaseModel):
    quantity: int = Field(ge=0, le=50)


# ---- Orders ----
class PlaceOrderReq(BaseModel):
    delivery_latitude: float
    delivery_longitude: float
    delivery_note: Optional[str] = ""
    payment_method: str = "COD"


class StatusUpdateReq(BaseModel):
    status: str


class LocationCheckReq(BaseModel):
    latitude: float
    longitude: float


# ---- Staff / users management ----
class ManagerReq(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str = Field(min_length=6)
    profile_photo: str = ""
    permissions: List[str] = []
    status: str = "active"
    notes: str = ""


class ManagerUpdateReq(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    profile_photo: Optional[str] = None
    permissions: Optional[List[str]] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    password: Optional[str] = None


class DeliveryPartnerReq(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str = Field(min_length=6)
    profile_photo: str = ""
    vehicle_type: str = ""
    vehicle_number: str = ""
    emergency_contact: str = ""
    joining_date: str = ""
    notes: str = ""
    status: str = "active"


class DeliveryPartnerUpdateReq(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    profile_photo: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    emergency_contact: Optional[str] = None
    joining_date: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    password: Optional[str] = None


# ---- Delivery ----
class AssignReq(BaseModel):
    order_id: str
    delivery_partner_id: str


class LocationUpdateReq(BaseModel):
    latitude: float
    longitude: float


# ---- Settings ----
class SettingsReq(BaseModel):
    business_name: Optional[str] = None
    kitchen_latitude: Optional[float] = None
    kitchen_longitude: Optional[float] = None
    delivery_radius_km: Optional[float] = None
    tax_percent: Optional[float] = None


# ---- Profile ----
class ProfileReq(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    profile_photo: Optional[str] = None
