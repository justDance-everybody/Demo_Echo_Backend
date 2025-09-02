#!/usr/bin/env python3
"""
数据库表结构修复脚本
修复logs表的id字段AUTOINCREMENT问题
"""

import sqlite3
import sys
from pathlib import Path

def fix_database():
    """修复数据库表结构"""
    db_path = Path("app.db")
    
    if not db_path.exists():
        print("❌ 数据库文件不存在: app.db")
        return False
    
    print("🔧 开始修复数据库表结构...")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 1. 检查logs表结构
        print("\n📋 检查logs表结构...")
        cursor.execute("PRAGMA table_info(logs)")
        columns = cursor.fetchall()
        
        print("当前logs表结构:")
        for col in columns:
            print(f"  {col[1]} {col[2]} {'NOT NULL' if col[3] else 'NULL'} {'PRIMARY KEY' if col[5] else ''}")
        
        # 2. 检查logs表是否有数据
        cursor.execute("SELECT COUNT(*) FROM logs")
        count = cursor.fetchone()[0]
        print(f"\n📊 logs表当前记录数: {count}")
        
        # 3. 修复logs表结构
        print("\n🔧 修复logs表结构...")
        
        if count == 0:
            # 如果表为空，直接删除重建
            print("表为空，删除重建...")
            cursor.execute("DROP TABLE IF EXISTS logs")
            
            # 重新创建logs表
            cursor.execute("""
                CREATE TABLE logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id VARCHAR(36) NOT NULL,
                    step VARCHAR(32) NOT NULL,
                    status VARCHAR(32) NOT NULL,
                    message TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            print("✅ logs表重建完成")
            
        else:
            # 如果表有数据，需要迁移数据
            print("表有数据，需要迁移...")
            
            # 创建临时表
            cursor.execute("""
                CREATE TABLE logs_temp (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id VARCHAR(36) NOT NULL,
                    step VARCHAR(32) NOT NULL,
                    status VARCHAR(32) NOT NULL,
                    message TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 复制数据（除了id字段）
            cursor.execute("""
                INSERT INTO logs_temp (session_id, step, status, message, timestamp)
                SELECT session_id, step, status, message, timestamp FROM logs
            """)
            
            # 删除原表
            cursor.execute("DROP TABLE logs")
            
            # 重命名临时表
            cursor.execute("ALTER TABLE logs_temp RENAME TO logs")
            
            print("✅ logs表数据迁移完成")
        
        # 4. 验证修复结果
        print("\n🔍 验证修复结果...")
        cursor.execute("PRAGMA table_info(logs)")
        columns = cursor.fetchall()
        
        print("修复后的logs表结构:")
        for col in columns:
            print(f"  {col[1]} {col[2]} {'NOT NULL' if col[3] else 'NULL'} {'PRIMARY KEY' if col[5] else ''}")
        
        # 5. 检查其他可能有问题的表
        print("\n🔍 检查其他表结构...")
        
        # 检查users表
        try:
            cursor.execute("PRAGMA table_info(users)")
            user_columns = cursor.fetchall()
            print("\nusers表结构:")
            for col in user_columns:
                print(f"  {col[1]} {col[2]} {'NOT NULL' if col[3] else 'NULL'} {'PRIMARY KEY' if col[5] else ''}")
        except sqlite3.OperationalError:
            print("users表不存在")
        
        # 检查tools表
        try:
            cursor.execute("PRAGMA table_info(tools)")
            tool_columns = cursor.fetchall()
            print("\ntools表结构:")
            for col in tool_columns:
                print(f"  {col[1]} {col[2]} {'NOT NULL' if col[3] else 'NULL'} {'PRIMARY KEY' if col[5] else ''}")
        except sqlite3.OperationalError:
            print("tools表不存在")
        
        # 6. 提交更改
        conn.commit()
        print("\n✅ 数据库修复完成！")
        
        return True
        
    except Exception as e:
        print(f"❌ 修复过程中发生错误: {e}")
        conn.rollback()
        return False
        
    finally:
        conn.close()

def test_logs_insertion():
    """测试logs表插入功能"""
    print("\n🧪 测试logs表插入功能...")
    
    try:
        conn = sqlite3.connect("app.db")
        cursor = conn.cursor()
        
        # 测试插入
        cursor.execute("""
            INSERT INTO logs (session_id, step, status, message)
            VALUES (?, ?, ?, ?)
        """, ("test_session", "test_step", "test_status", "test message"))
        
        # 获取插入的ID
        inserted_id = cursor.lastrowid
        print(f"✅ 测试插入成功，ID: {inserted_id}")
        
        # 查询验证
        cursor.execute("SELECT * FROM logs WHERE id = ?", (inserted_id,))
        result = cursor.fetchone()
        print(f"查询结果: {result}")
        
        # 清理测试数据
        cursor.execute("DELETE FROM logs WHERE id = ?", (inserted_id,))
        print("✅ 测试数据清理完成")
        
        conn.commit()
        return True
        
    except Exception as e:
        print(f"❌ 测试插入失败: {e}")
        return False
        
    finally:
        conn.close()

def main():
    """主函数"""
    print("=" * 60)
    print("数据库表结构修复工具")
    print("=" * 60)
    
    # 修复数据库
    if fix_database():
        # 测试修复结果
        if test_logs_insertion():
            print("\n🎉 所有修复和测试都成功完成！")
            print("现在可以正常使用意图处理功能了。")
        else:
            print("\n⚠️ 修复完成但测试失败，请检查数据库。")
    else:
        print("\n❌ 数据库修复失败！")
        sys.exit(1)

if __name__ == "__main__":
    main()
