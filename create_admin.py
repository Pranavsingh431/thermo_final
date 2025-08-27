#!/usr/bin/env python3
"""
Create admin user for testing purposes
"""
import sys
import os
sys.path.append('/home/ubuntu/repos/thermo_final/backend')

from app.models import User, Base
from app.auth.security import get_password_hash
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import DATABASE_URL

def create_admin_user():
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        existing_user = db.query(User).filter(User.email == 'test@admin.com').first()
        if existing_user:
            existing_user.hashed_password = get_password_hash('TestAdmin123!')
            db.commit()
            print('✅ Updated existing test admin user: test@admin.com / TestAdmin123!')
        else:
            admin = User(
                email='test@admin.com',
                hashed_password=get_password_hash('TestAdmin123!'),
                role='admin'
            )
            db.add(admin)
            db.commit()
            print('✅ Created test admin user: test@admin.com / TestAdmin123!')
            
        users = db.query(User).all()
        print(f'\n📋 Total users in database: {len(users)}')
        for user in users:
            print(f'   - {user.email} (role: {user.role})')
            
    except Exception as e:
        print(f'❌ Error: {e}')
        db.rollback()
    finally:
        db.close()

if __name__ == '__main__':
    create_admin_user()
