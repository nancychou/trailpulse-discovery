from pydantic import BaseModel


class SignUpRequest(BaseModel):
    email: str
    password: str
    display_name: str


class SignInRequest(BaseModel):
    email: str
    password: str


class UserInfo(BaseModel):
    id: str
    email: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserInfo


class ForgotPasswordRequest(BaseModel):
    email: str
