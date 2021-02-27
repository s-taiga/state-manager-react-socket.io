# 機器状態管理アプリ
パソコンなどについて使用状態を動的管理できるツールです
socket.ioを用いているのでこのページで使用状態を変更すると見ている人の画面にも即座に反映されます

# 起動方法
このアプリはReactの画面とexpressのサーバーの二つのプロジェクトがあります
画面の方はstate-manage-react配下にて`yarn start`か`yarn build`したうえで`serve -s build -l 3000`などとしてください
サーバーの方はこの階層で`node server.js`としてください