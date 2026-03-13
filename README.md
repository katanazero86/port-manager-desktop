# Port Manager Desktop

Electron, React, Vite 기반으로 만든 크로스플랫폼 포트 관리 데스크톱 앱입니다. macOS와 Windows에서 현재 열려 있는 포트를 조회하고, 점유 중인 프로세스를 빠르게 확인하거나 종료할 수 있습니다.

## 기본 기능

- TCP, UDP 포트 점유 현황 조회
- 포트, PID, 프로세스명, CPU, 메모리 기준 검색
- PID 기준 프로세스 종료
- Node, Python, Java, Docker 대상 Quick Kill
- 관리자 권한 상태 확인 및 권한 상승 요청
- 한국어, 영어 전환 지원
- 개발 포트 범위 `3000-9999` 필터 제공

## 기술 스택

- Electron
- React 19
- Vite
- Tailwind CSS
- i18next / react-i18next
- Node.js `child_process`

## 프로젝트 구조

```text
.
|-- electron
|   |-- main.cjs          # Electron 메인 프로세스, 윈도우 생성
|   |-- ipc-handlers.cjs  # IPC 등록
|   |-- preload.cjs       # renderer에 노출할 안전한 브리지 API
|   `-- port-service.cjs  # OS별 포트 조회, 프로세스 종료, Quick Kill 처리
|-- src
|   |-- App.jsx           # 화면 상태 관리, 포트 조회/종료 흐름 제어
|   |-- components        # 사이드바, 테이블, 툴바, 다이얼로그 UI
|   |-- locales           # 다국어 리소스
|   |-- i18n.js           # i18n 초기화
|   `-- index.css         # 전역 스타일
|-- assets                # 아이콘 등 정적 리소스
|-- vite.config.js        # Vite 개발 서버 설정
`-- package.json          # 스크립트, 의존성, Electron Builder 설정
```

## 실행

```bash
npm install
npm run dev
```

렌더러를 빌드한 뒤 Electron만 실행하려면 아래 명령을 사용합니다.

```bash
npm run build:renderer
npm start
```

## 빌드

```bash
npm run build
```

## 실행 흐름

1. `npm run dev`를 실행하면 Vite 개발 서버가 `127.0.0.1:5173`에서 렌더러를 제공합니다.
2. `wait-on`이 개발 서버 준비를 기다린 뒤 Electron 앱을 실행합니다.
3. Electron 메인 프로세스는 `BrowserWindow`를 생성하고, 개발 중에는 Vite URL을 로드합니다.
4. `preload.cjs`가 `window.portManager` API를 renderer에 노출합니다.
5. React 앱은 `window.portManager.listPorts()`를 호출해 포트 목록과 관리자 권한 상태를 요청합니다.
6. 메인 프로세스는 `port-service.cjs`를 통해 macOS에서는 `lsof`, `ps`, Windows에서는 `netstat`, PowerShell 기반 정보를 수집합니다.
7. 사용자가 프로세스 종료나 Quick Kill을 실행하면 renderer -> IPC -> main -> OS 명령 순서로 처리한 뒤 목록을 새로고침합니다.

## Preview

![img.png](img.png)

![img_1.png](img_1.png)

![img_2.png](img_2.png)

![img_3.png](img_3.png)
