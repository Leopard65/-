<script>
import { seedStorage } from '@/mock/data'
import { useUserStore } from '@/stores/user'

export default {
  onLaunch() {
    seedStorage()
    const userStore = useUserStore()
    if (userStore.token) userStore.getUserInfo()
  },
  onShow() {},
  onHide() {}
}
</script>

<style>
page {
  min-height: 100%;
  color: #1f2522;
  background: #f7f5f0;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", Arial, sans-serif;
}

button {
  padding: 0;
}

button::after {
  border: none;
}

.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-ellipsis-2 {
  display: -webkit-box;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.safe-area-bottom {
  padding-bottom: calc(18rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(18rpx + env(safe-area-inset-bottom));
}
</style>
