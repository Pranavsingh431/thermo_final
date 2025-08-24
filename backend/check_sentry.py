import sentry_sdk
from sentry_sdk import integrations

print("Sentry SDK available integrations:")
print(dir(integrations))

try:
    from sentry_sdk.integrations.sqlalchemy import SqlAlchemyIntegration
    print("SqlAlchemyIntegration is available")
except ImportError as e:
    print(f"SqlAlchemyIntegration import error: {e}")

try:
    from sentry_sdk.integrations import sqlalchemy
    print("sqlalchemy module contents:", dir(sqlalchemy))
except ImportError as e:
    print(f"sqlalchemy module import error: {e}")
