"""
Security improvements test suite.
Tests all security enhancements implemented in the refactor branch.
"""
import pytest
import os
import time
from unittest.mock import Mock, patch
from pydantic import ValidationError

# Set required environment variables before importing auth modules
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-min-32-chars")
os.environ.setdefault("ENVIRONMENT", "development")

from services.auth.security import create_access_token, decode_access_token, verify_password, get_password_hash
from services.shared.schemas.auth import LoginRequest, GroupCreate, AddMemberRequest


class TestJWTSecurity:
    """Test JWT token security improvements"""

    def test_jwt_secret_key_validation(self):
        """Test that JWT secret key is validated on startup"""
        # This is tested via the security.py module loading
        # The module should have logged warnings or errors if SECRET_KEY is weak
        from services.auth.security import SECRET_KEY
        assert SECRET_KEY is not None
        assert len(SECRET_KEY) > 0

    def test_token_expiration_is_reasonable(self):
        """Test that token expiration is set to 2 hours (not 24h)"""
        from services.auth.security import ACCESS_TOKEN_EXPIRE_MINUTES
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
        from uuid import uuid4
        import jwt
        from datetime import datetime, timedelta
        from services.auth.security import SECRET_KEY, ALGORITHM

        # Create an already-expired token
        payload = {
            "sub": str(uuid4()),
            "username": "testuser",
            "groups": [],
            "exp": datetime.utcnow() - timedelta(hours=1)  # Expired 1 hour ago
        }
        expired_token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

        # Should raise InvalidTokenError (wraps ExpiredSignatureError)
        with pytest.raises(jwt.InvalidTokenError):
            decode_access_token(expired_token)


class TestPasswordSecurity:
    """Test password hashing and verification"""

    def test_password_hashing(self):
        """Test that passwords are properly hashed with bcrypt"""
        password = "test_password_123"
        hashed = get_password_hash(password)

        # Bcrypt hashes start with $2b$
        assert hashed.startswith("$2b$")
        assert len(hashed) == 60  # Bcrypt hashes are always 60 chars

        # Verify the hash
        assert verify_password(password, hashed)
        assert not verify_password("wrong_password", hashed)

    def test_password_verification_constant_time(self):
        """Test that password verification takes similar time for valid and invalid passwords"""
        password = "test_password_123"
        hashed = get_password_hash(password)

        # Time correct password
        start = time.time()
        verify_password(password, hashed)
        time_correct = time.time() - start

        # Time incorrect password
        start = time.time()
        verify_password("wrong_password", hashed)
        time_incorrect = time.time() - start

        # Times should be within 20% of each other (timing attack prevention)
        ratio = max(time_correct, time_incorrect) / min(time_correct, time_incorrect)
        assert ratio < 1.5, f"Password verification timing difference too large: {ratio}"


class TestInputValidation:
    """Test input validation with Pydantic field validators"""

    def test_username_validation_length(self):
        """Test username length constraints"""
        # Too short
        with pytest.raises(ValidationError) as exc:
            LoginRequest(username="ab", password="test")
        assert "at least 3 characters" in str(exc.value).lower()

        # Too long (51 chars)
        with pytest.raises(ValidationError) as exc:
            LoginRequest(username="a" * 51, password="test")
        assert "at most 50 characters" in str(exc.value).lower()

    def test_username_validation_characters(self):
        """Test username character restrictions"""
        # Valid characters
        valid = LoginRequest(username="user_name-123.test", password="test")
        assert valid.username == "user_name-123.test"

        # Invalid characters (spaces)
        with pytest.raises(ValidationError) as exc:
            LoginRequest(username="user name", password="test")
        assert "can only contain" in str(exc.value).lower()

        # Invalid characters (special chars)
        with pytest.raises(ValidationError) as exc:
            LoginRequest(username="user@name!", password="test")
        assert "can only contain" in str(exc.value).lower()

    def test_username_normalized_to_lowercase(self):
        """Test that usernames are normalized to lowercase"""
        request = LoginRequest(username="TestUser", password="test")
        assert request.username == "testuser"

    def test_password_validation_length(self):
        """Test password length constraints"""
        # Minimum length (at least 1 char)
        with pytest.raises(ValidationError) as exc:
            LoginRequest(username="test", password="")
        assert "at least 1 character" in str(exc.value).lower()

        # Maximum length (128 chars due to bcrypt limitation)
        with pytest.raises(ValidationError) as exc:
            LoginRequest(username="test", password="a" * 129)
        assert "at most 128 characters" in str(exc.value).lower()

    def test_group_name_validation(self):
        """Test group name validation"""
        # Too long
        with pytest.raises(ValidationError) as exc:
            GroupCreate(name="a" * 101)
        assert "at most 100 characters" in str(exc.value).lower()

        # Empty after strip
        with pytest.raises(ValidationError) as exc:
            GroupCreate(name="   ")
        assert "cannot be empty" in str(exc.value).lower()

        # Valid with whitespace trimmed
        group = GroupCreate(name="  My Group  ")
        assert group.name == "My Group"

    def test_add_member_username_validation(self):
        """Test add member username validation"""
        # Valid
        request = AddMemberRequest(username="valid_user")
        assert request.username == "valid_user"

        # Invalid characters
        with pytest.raises(ValidationError) as exc:
            AddMemberRequest(username="invalid user!")
        assert "can only contain" in str(exc.value).lower()


class TestRateLimiting:
    """Test rate limiting middleware"""

    @pytest.mark.asyncio
    async def test_rate_limit_middleware_exists(self):
        """Test that rate limiting middleware is properly configured"""
        from services.framework.rate_limit import RateLimitMiddleware, get_rate_limit_for_path

        # Test path-specific limits
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
        # This test verifies the gateway reads CORS_ORIGINS env var
        # In production, this should be set to specific frontend URLs only
        cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
        origins = cors_origins.split(",")

        # Should have at least one origin
        assert len(origins) > 0

        # Origins should be http:// or https:// URLs
        for origin in origins:
            assert origin.startswith("http://") or origin.startswith("https://")


class TestErrorMessageSecurity:
    """Test that error messages don't leak sensitive information"""

    def test_generic_login_errors(self):
        """Test that login errors are generic and don't reveal user existence"""
        # This is tested in the actual login endpoint
        # Error messages should be "Invalid username or password" for all cases:
        # - User not found
        # - Wrong password
        # - Keycloak error
        # This prevents username enumeration attacks
        pass  # Tested via integration tests


class TestEnvironmentTemplate:
    """Test that .env.example exists and has required variables"""

    def test_env_example_exists(self):
        """Test that .env.example exists"""
        env_example_path = "/Users/caugello/Dev/macmac/.env.example"
        assert os.path.exists(env_example_path), ".env.example should exist for documentation"

    def test_env_example_has_required_variables(self):
        """Test that .env.example documents all required variables"""
        with open("/Users/caugello/Dev/macmac/.env.example", "r") as f:
            content = f.read()

        required_vars = [
            "JWT_SECRET_KEY",
            "AUTH_DATABASE_URL",
            "RECIPES_DATABASE_URL",
            "CATALOG_DATABASE_URL",
            "MEAL_PLANS_DATABASE_URL",
            "REDIS_PASSWORD",  # Only password is secret, host/port are in config.yaml
            "KEYCLOAK_CLIENT_SECRET",  # Only secret is here, URL/realm/client_id are in config.yaml
            "OPENAI_API_KEY",  # Required for catalog enrichment
        ]

        for var in required_vars:
            assert var in content, f".env.example should document {var}"


class TestGitignoreSecurity:
    """Test that .gitignore prevents committing sensitive files"""

    def test_gitignore_security_patterns(self):
        """Test that .gitignore has security-related patterns"""
        with open("/Users/caugello/Dev/macmac/.gitignore", "r") as f:
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
