#!/usr/bin/env python3
"""
自动化API测试运行脚本

使用方法:
    python run_tests.py                    # 运行所有测试
    python run_tests.py --auth            # 只运行认证测试
    python run_tests.py --core            # 只运行核心功能测试
    python run_tests.py --dev             # 只运行开发者功能测试
    python run_tests.py --performance     # 只运行性能测试
    python run_tests.py --errors          # 只运行错误处理测试
    python run_tests.py --quick           # 快速测试（跳过耗时测试）
    python run_tests.py --verbose         # 详细输出
    python run_tests.py --coverage        # 生成覆盖率报告
"""

import sys
import os
import subprocess
import argparse
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def run_command(cmd, description):
    """运行命令并处理结果"""
    print(f"\n🔄 {description}")
    print(f"执行命令: {' '.join(cmd)}")

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=project_root)

        if result.returncode == 0:
            print(f"✅ {description} 成功")
            if result.stdout:
                print("输出:", result.stdout)
        else:
            print(f"❌ {description} 失败")
            if result.stderr:
                print("错误:", result.stderr)
            if result.stdout:
                print("输出:", result.stdout)
            return False

    except Exception as e:
        print(f"❌ {description} 异常: {e}")
        return False

    return True

def check_environment():
    """检查测试环境"""
    print("🔍 检查测试环境...")

    # 检查Python版本
    python_version = sys.version_info
    if python_version < (3, 8):
        print(f"❌ Python版本过低: {python_version.major}.{python_version.minor}")
        print("需要Python 3.8或更高版本")
        return False

    print(f"✅ Python版本: {python_version.major}.{python_version.minor}.{python_version.micro}")

    # 检查pytest是否安装
    try:
        import pytest
        print(f"✅ pytest版本: {pytest.__version__}")
    except ImportError:
        print("❌ pytest未安装，正在安装...")
        if not run_command([sys.executable, "-m", "pip", "install", "pytest"], "安装pytest"):
            return False

    # 检查虚拟环境
    if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("✅ 虚拟环境已激活")
    else:
        print("⚠️  未检测到虚拟环境，建议在虚拟环境中运行测试")

    return True

def run_tests(test_type, quick_mode=False, verbose=False, coverage=False):
    """运行指定类型的测试"""
    test_dir = "app/tests"

    if not os.path.exists(test_dir):
        print(f"❌ 测试目录不存在: {test_dir}")
        return False

    # 构建pytest命令
    cmd = [sys.executable, "-m", "pytest"]

    # 添加测试类型过滤
    if test_type == "auth":
        cmd.extend([
            f"{test_dir}/test_1_user_authentication.py",
            f"{test_dir}/test_2_permission_control.py"
        ])
    elif test_type == "core":
        cmd.extend([
            f"{test_dir}/test_3_intent_interpretation.py",
            f"{test_dir}/test_4_confirmation_flow.py",
            f"{test_dir}/test_5_direct_tool_execution.py"
        ])
    elif test_type == "dev":
        cmd.extend([
            f"{test_dir}/test_6_developer_tool_management.py",
            f"{test_dir}/test_7_mcp_server_monitoring.py"
        ])
    elif test_type == "performance":
        cmd.extend([
            f"{test_dir}/test_8_concurrent_requests.py",
            f"{test_dir}/test_9_response_time.py"
        ])
    elif test_type == "errors":
        cmd.extend([f"{test_dir}/test_10_error_handling.py"])
    else:
        # 运行所有测试
        cmd.extend([test_dir])

    # 添加快速模式标记
    if quick_mode:
        cmd.extend(["-m", "not slow"])

    # 添加详细输出
    if verbose:
        cmd.extend(["-v", "-s"])

    # 添加覆盖率
    if coverage:
        cmd.extend(["--cov=app", "--cov-report=html", "--cov-report=term"])

    # 添加其他有用的选项
    cmd.extend([
        "--tb=short",  # 简短的错误回溯
        "--maxfail=5",  # 最多失败5个测试后停止
        "--durations=10"  # 显示最慢的10个测试
    ])

    # 运行测试
    description = f"运行{test_type}测试" if test_type != "all" else "运行所有测试"
    return run_command(cmd, description)

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="自动化API测试运行脚本")
    parser.add_argument("--auth", action="store_true", help="只运行认证测试")
    parser.add_argument("--core", action="store_true", help="只运行核心功能测试")
    parser.add_argument("--dev", action="store_true", help="只运行开发者功能测试")
    parser.add_argument("--performance", action="store_true", help="只运行性能测试")
    parser.add_argument("--errors", action="store_true", help="只运行错误处理测试")
    parser.add_argument("--quick", action="store_true", help="快速测试模式（跳过耗时测试）")
    parser.add_argument("--verbose", "-v", action="store_true", help="详细输出")
    parser.add_argument("--coverage", action="store_true", help="生成覆盖率报告")

    args = parser.parse_args()

    print("🚀 Echo AI 后端自动化API测试")
    print("=" * 50)

    # 检查环境
    if not check_environment():
        print("❌ 环境检查失败，退出测试")
        sys.exit(1)

    # 确定测试类型
    test_type = "all"
    if args.auth:
        test_type = "auth"
    elif args.core:
        test_type = "core"
    elif args.dev:
        test_type = "dev"
    elif args.performance:
        test_type = "performance"
    elif args.errors:
        test_type = "errors"

    # 运行测试
    success = run_tests(
        test_type=test_type,
        quick_mode=args.quick,
        verbose=args.verbose,
        coverage=args.coverage
    )

    if success:
        print("\n🎉 测试执行完成！")
        if args.coverage:
            print("📊 覆盖率报告已生成，请查看 htmlcov/index.html")
    else:
        print("\n💥 测试执行失败！")
        sys.exit(1)

if __name__ == "__main__":
    main()
