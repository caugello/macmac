# MacMac Scripts

Development and testing utilities.

## Available Scripts

### `generate_fake_data.sh`

Generates realistic test data for development and testing.

**What it creates**:
- 13 Catalog items (groceries with nutrition and prices)
- 10 Recipes (linked to catalog items)
- Meal plans for configurable weeks (default: 2)

**Usage**:

```bash
# Generate full dataset
./scripts/generate_fake_data.sh

# Generate 4 weeks of meal plans
./scripts/generate_fake_data.sh --weeks 4

# Start from specific date
./scripts/generate_fake_data.sh --start-date 2026-06-01

# Generate specific parts
./scripts/generate_fake_data.sh --catalog-only
./scripts/generate_fake_data.sh --recipes-only
./scripts/generate_fake_data.sh --meals-only
```

---

### `clear_fake_data.sh`

Clears all test data from databases.

**⚠️ WARNING**: Deletes ALL data, not just test data!

```bash
./scripts/clear_fake_data.sh
```

---

### `test_full_auth_flow.sh`

End-to-end authentication testing.

Tests: login, JWT validation, group management, recipe creation with authorization, unauthorized access rejection.

```bash
./scripts/test_full_auth_flow.sh
```

---

## Development Workflow

```bash
# 1. Start services (migrations run automatically)
podman-compose -f podman-compose-dev.yaml up -d

# 2. Generate test data
./scripts/generate_fake_data.sh

# 3. Test authentication
./scripts/test_full_auth_flow.sh
```

---

## Notes

- **Migrations**: Run automatically via podman-compose, no manual scripts needed
- **Default user**: Created automatically on first auth service startup
- **Test data**: Deterministic catalog/recipes, random meal plans
- **IDs**: Cached in `/tmp/macmac_*_ids.txt` for partial regeneration
