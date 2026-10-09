# 테스트 쇼핑몰

PETRA의 협업 동작을 확인하기 위한 작은 앱이다. 실제 상품이나 외부 서비스를 사용하지 않는다.
`node --test`로 가격 함수의 기본 동작을 검증한다.

solp와 amazon이 각자 에이전트로 이 폴더를 열고 상품 화면과 장바구니를 만든다고 가정한다.
각 clone의 origin은 실험실 내부 bare Git 저장소다. 이곳의 commit/push는 GitHub에 올라가지 않는다.
원본 앱은 PETRA 저장소의 `tests/fixtures/shop/`에 보관한다.
