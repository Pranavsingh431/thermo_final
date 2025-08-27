#!/usr/bin/env python3
"""
Create the correct admin user for authentication
"""
import sys
import os
sys.path.append('/home/ubuntu/repos/thermo_final/backend')

from app.models import User, Base
from app.auth.security import get_password_hash
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import DATABASE_URL

def create_correct_admin():
    print(f'🔍 Using DATABASE_URL: {DATABASE_URL}')
    
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
            
            existing_user = db.query(User).filter(User.email == 'admin@example.com').first()
            if existing_user:
                existing_user.hashed_password = get_password_hash('admin@123')
                db.commit()
                print('✅ Updated admin@example.com password to admin@123')
            else:
                admin = User(
                    email='admin@example.com',
                    hashed_password=get_password_hash('admin@123'),
                    role='admin'
                )
                db.add(admin)
                db.commit()
                print('✅ Created admin@example.com with password admin@123')
                
            final_check = db.query(User).filter(User.email == 'admin@example.com').first()
            if final_check:
                print(f'✅ Verification: admin@example.com exists with role {final_check.role}')
            else:
                print('❌ Error: admin@example.com was not created properly')
                
        except Exception as e:
            print(f'❌ Database operation error: {e}')
            db.rollback()
        finally:
            db.close()
            
    except Exception as e:
        print(f'❌ Database connection error: {e}')

if __name__ == '__main__':
    create_correct_admin()
