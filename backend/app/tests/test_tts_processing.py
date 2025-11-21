from app.services.execute_service import ExecuteService

def test_address_abbrev_evm():
    es = ExecuteService()
    raw = "向地址 0x1234567890abcdef1234567890abcdef12345678 转账"
    out = es._abbrev_addresses(raw)
    assert "0x123456…5678" in out

def test_prefix_clean_and_length():
    es = ExecuteService()
    raw = "好的，以下是：余额 123.45 USDT，地址 0x1234567890abcdef1234567890abcdef12345678"
    out = es._faithful_tts({}, raw)
    assert "好的" not in out and "以下是" not in out
    assert "123.45" in out
    assert "0x123456…5678" in out

def test_json_like_extraction():
    es = ExecuteService()
    raw = '{ "pois": [ { "name": "小馆A", "address": "地址1" }, { "name": "小馆B", "address": "地址2" } ] …'
    speakable = es._extract_speakable_text(raw)
    assert "小馆A（地址1)".replace(")", "）")[:6] in speakable
    out = es._faithful_tts({}, speakable)
    assert "小馆A" in out or "小馆B" in out