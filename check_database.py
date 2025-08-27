#!/usr/bin/env python3
"""
Check database configuration and create admin user in correct database
"""
import sys
import os
sys.path.append('/home/ubuntu/repos/thermo_final/backend')

from app.config import DATABASE_URL
from app.models import User, Base
from app.auth.security import get_password_hash
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

def check_and_create_admin():
    print(f'🔍 Current DATABASE_URL: {DATABASE_URL}')
    
    try:
        engine = create_engine(DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        Base.metadata.create_all(bind=engine)
        print('✅ Database tables created/verified')
        
        db = SessionLocal()
        try:
            users = db.query(User).all()
            print(f'📋 Found {len(users)} existing users:')
            for user in users:
                print(f'   - {user.email} (role: {user.role})')
            
            existing_user = db.query(User).filter(User.email == 'test@admin.com').first()
            if existing_user:
                print('✅ Test admin user already exists: test@admin.com')
            else:
                admin = User(
                    email='test@admin.com',
                    hashed_password=get_password_hash('TestAdmin123!'),
                    role='admin'
                )
                db.add(admin)
                db.commit()
                print('✅ Created test admin user: test@admin.com / TestAdmin123!')
                
        except Exception as e:
            print(f'❌ Database operation error: {e}')
            db.rollback()
        finally:
            db.close()
            
    except Exception as e:
        print(f'❌ Database connection error: {e}')
        print('This might indicate a database configuration issue')

if __name__ == '__main__':
    check_and_create_admin()
