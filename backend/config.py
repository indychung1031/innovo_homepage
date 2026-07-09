"""애플리케이션 설정 — .env 환경변수 로드."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Innovo_homepage 백엔드 설정."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # PostgreSQL
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "innovo_homepage"
    postgres_user: str = ""
    postgres_password: str = ""

    # 앱 — app_env 기본값은 production: 환경변수 누락 시 개발용 완화(2FA 우회·SQL echo·
    # insecure 쿠키)가 운영에서 켜지는 사고를 막는다. 로컬은 .env에 development 명시.
    secret_key: str = "change-me"
    app_env: str = "production"

    # SMTP (Mailnara)
    smtp_host: str = "smtp.mailnara.com"
    smtp_port: int = 465
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "sbchung@innovotech.co.kr"
    sales_notify_email: str = "sbchung@innovotech.co.kr"

    # reCAPTCHA v3
    recaptcha_site_key: str = ""
    recaptcha_secret_key: str = ""
    recaptcha_skip_verify: bool = False

    # Rate limit
    rate_limit_per_minute: int = 10

    # JWT
    admin_secret_key: str = "change-me-admin"
    jwt_access_expire_minutes: int = 60
    jwt_refresh_expire_days: int = 14
    admin_jwt_expire_minutes: int = 480

    # 앱 URL (이메일 링크)
    app_base_url: str = "http://127.0.0.1:8000"

    # Contact 업로드
    contact_upload_max_bytes: int = 10_485_760
    contact_upload_dir: str = "upload/contact"

    # Admin 2FA 개발용 우회 — 운영에서는 항상 False여야 한다
    admin_2fa_dev_bypass: bool = False

    # Admin seed (최초 1회)
    admin_seed_email: str = "sbchung@innovotech.co.kr"
    admin_seed_password: str = ""
    admin_seed_display_name: str = "Sales Manager"
    admin_seed_roles: str = "sales_admin"

    # ERP API
    erp_api_base_url: str = ""
    erp_api_key: str = ""

    @property
    def database_url(self) -> str:
        """SQLAlchemy 동기 연결 URL."""
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def is_development(self) -> bool:
        return self.app_env.lower() in ("development", "dev", "local")


@lru_cache
def get_settings() -> Settings:
    """설정 싱글톤 — 테스트 시 cache_clear()로 교체 가능."""
    return Settings()
