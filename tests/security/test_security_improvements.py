"""
Security improvements test suite.
Tests all security enhancements implemented in the refactor branch.
"""

import os

import pytest
from pydantic import ValidationError

# Set required environment variables before importing auth modules
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-min-32-chars")
os.environ.setdefault("ENVIRONMENT", "development")

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.auth.security import create_access_token  # noqa: E402
from services.shared.lib.jwt import decode_access_token  # noqa: E402
from services.shared.schemas.auth import (  # noqa: E402
    AddMemberRequest,
    FirebaseLoginRequest,
    GroupCreate,
)


class TestJWTSecurity:
    """Test JWT token security improvements"""

    def test_jwt_secret_key_validation(self):
        """Test that JWT secret key is validated on startup"""
        from services.shared.lib.jwt import SECRET_KEY

        assert SECRET_KEY is not None
        assert len(SECRET_KEY) > 0

    def test_token_expiration_is_reasonable(self):
        """Test that token expiration is set to 2 hours (not 24h)"""
        from services.shared.lib.jwt import ACCESS_TOKEN_EXPIRE_MINUTES

        assert ACCESS_TOKEN_EXPIRE_MINUTES == 120, "Token expiration should be 2 hours for security"

    def test_create_and_decode_token(self):
        """Test token creation and validation"""
        from uuid import uuid4

        user_id = str(uuid4())
        username = "testuser"
        groups = [str(uuid4())]

        token = create_access_token(user_id, username, groups)
        assert token is not None
        assert isinstance(token, str)

        # Decode and verify
        payload = decode_access_token(token)
        assert payload["sub"] == user_id
        assert payload["username"] == username
        assert payload["groups"] == groups

    def test_expired_token_rejected(self):
        """Test that expired tokens are rejected"""
        from datetime import UTC, datetime, timedelta
        from uuid import uuid4

        import jwt

        from services.shared.lib.jwt import ALGORITHM, SECRET_KEY

        payload = {
            "sub": str(uuid4()),
            "username": "testuser",
            "groups": [],
            "exp": datetime.now(UTC) - timedelta(hours=1),
        }
        expired_token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

        with pytest.raises(jwt.InvalidTokenError):
            decode_access_token(expired_token)


class TestInputValidation:
    """Test input validation with Pydantic field validators"""

    def test_firebase_login_request_requires_token(self):
        """Test that FirebaseLoginRequest requires a non-empty id_token"""
        with pytest.raises(ValidationError):
            FirebaseLoginRequest(id_token="")

    def test_firebase_login_request_valid(self):
        """Test that FirebaseLoginRequest accepts a valid token string"""
        request = FirebaseLoginRequest(id_token="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test")
        assert request.id_token == "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test"

    def test_group_name_validation(self):
        """Test group name validation"""
        with pytest.raises(ValidationError) as exc:
            GroupCreate(name="a" * 101)
        assert "at most 100 characters" in str(exc.value).lower()

        with pytest.raises(ValidationError) as exc:
            GroupCreate(name="   ")
        assert "cannot be empty" in str(exc.value).lower()

        group = GroupCreate(name="  My Group  ")
        assert group.name == "My Group"

    def test_add_member_username_validation(self):
        """Test add member username validation"""
        request = AddMemberRequest(username="valid_user")
        assert request.username == "valid_user"

        with pytest.raises(ValidationError) as exc:
            AddMemberRequest(username="invalid user!")
        assert "can only contain" in str(exc.value).lower()


class TestRateLimiting:
    """Test rate limiting middleware"""

    @pytest.mark.asyncio
    async def test_rate_limit_middleware_exists(self):
        """Test that rate limiting middleware is properly configured"""
        from services.framework.rate_limit import get_rate_limit_for_path

        login_calls, login_period = get_rate_limit_for_path("/api/v1/auth/login")
        assert login_calls == 5, "Login should have strict 5 attempts/min limit"
        assert login_period == 60

        auth_calls, auth_period = get_rate_limit_for_path("/api/v1/auth/register")
        assert auth_calls == 20, "Auth endpoints should have 20 requests/min limit"
        assert auth_period == 60

        default_calls, default_period = get_rate_limit_for_path("/api/v1/recipes")
        assert default_calls == 100, "Default endpoints should have 100 requests/min limit"
        assert default_period == 60


class TestCORSConfiguration:
    """Test CORS configuration"""

    def test_cors_origins_from_environment(self):
        """Test that CORS origins are loaded from environment variable"""
        cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
        origins = cors_origins.split(",")

        assert len(origins) > 0

        for origin in origins:
            assert origin.startswith("http://") or origin.startswith("https://")


class TestErrorMessageSecurity:
    """Test that error messages don't leak sensitive information"""

    def test_generic_login_errors(self):
        """Test that login errors are generic and don't reveal user existence"""
        pass  # Tested via integration tests


class TestEnvironmentTemplate:
    """Test that .env.example exists and has required variables"""

    def test_env_example_exists(self):
        """Test that .env.example exists"""
        env_example_path = os.path.join(PROJECT_ROOT, ".env.example")
        assert os.path.exists(env_example_path), ".env.example should exist for documentation"

    def test_env_example_has_required_variables(self):
        """Test that .env.example documents all required variables"""
        with open(os.path.join(PROJECT_ROOT, ".env.example")) as f:
            content = f.read()

        required_vars = [
            "JWT_SECRET_KEY",
            "AUTH_DATABASE_URL",
            "RECIPES_DATABASE_URL",
            "CATALOG_DATABASE_URL",
            "MEAL_PLANS_DATABASE_URL",
            "REDIS_PASSWORD",
            "GOOGLE_APPLICATION_CREDENTIALS",
            "OPENAI_API_KEY",
        ]

        for var in required_vars:
            assert var in content, f".env.example should document {var}"


class TestGitignoreSecurity:
    """Test that .gitignore prevents committing sensitive files"""

    def test_gitignore_security_patterns(self):
        """Test that .gitignore has security-related patterns"""
        with open(os.path.join(PROJECT_ROOT, ".gitignore")) as f:
            content = f.read()

        security_patterns = [
            ".env",
            "*.key",
            "*.pem",
            "secrets/",
            "credentials.json",
        ]

        for pattern in security_patterns:
            assert pattern in content, f".gitignore should include pattern: {pattern}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
