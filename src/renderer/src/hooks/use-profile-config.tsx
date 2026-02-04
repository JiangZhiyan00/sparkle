import React, { createContext, useContext, ReactNode, useEffect, useRef } from 'react'
import useSWR from 'swr'
import {
  getProfileConfig,
  setProfileConfig as set,
  addProfileItem as add,
  removeProfileItem as remove,
  updateProfileItem as update,
  changeCurrentProfile as change
} from '@renderer/utils/ipc'

// 默认的免费订阅
export const DEFAULT_FREE_PROFILE: Partial<ProfileItem> = {
  id: 'z8e7d6c5-b4a3-2019-8765-4321fedcba98',
  type: 'remote',
  name: '免费优选IP(不保证可用性)',
  url: 'https://url.v1.mk/sub?target=clash&url=https%3A%2F%2Ffree.jzy88.top%2F60156344-dbc3-4614-8177-fd337539a473%2Fsub&insert=false&config=https%3A%2F%2Fraw.githubusercontent.com%2FbyJoey%2Ftest%2Frefs%2Fheads%2Fmain%2Ftist.ini&emoji=true&list=false&xudp=false&udp=false&tfo=false&expand=true&scv=false&fdn=false&new_name=true',
  verify: false,
  interval: 20,
  useProxy: false,
  locked: true,
  autoUpdate: true
}

interface ProfileConfigContextType {
  profileConfig: ProfileConfig | undefined
  setProfileConfig: (config: ProfileConfig) => Promise<void>
  mutateProfileConfig: () => void
  addProfileItem: (item: Partial<ProfileItem>) => Promise<void>
  updateProfileItem: (item: ProfileItem) => Promise<void>
  removeProfileItem: (id: string) => Promise<void>
  changeCurrentProfile: (id: string) => Promise<void>
}

const ProfileConfigContext = createContext<ProfileConfigContextType | undefined>(undefined)

export const ProfileConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: profileConfig, mutate: mutateProfileConfig } = useSWR('getProfileConfig', () =>
    getProfileConfig()
  )

  const setProfileConfig = async (config: ProfileConfig): Promise<void> => {
    try {
      await set(config)
    } catch (e) {
      alert(e)
    } finally {
      mutateProfileConfig()
      window.electron.ipcRenderer.send('updateTrayMenu')
    }
  }

  const addProfileItem = async (item: Partial<ProfileItem>): Promise<void> => {
    try {
      await add(item)
    } catch (e) {
      alert(e)
    } finally {
      mutateProfileConfig()
      window.electron.ipcRenderer.send('updateTrayMenu')
    }
  }

  const removeProfileItem = async (id: string): Promise<void> => {
    try {
      await remove(id)
    } catch (e) {
      alert(e)
    } finally {
      mutateProfileConfig()
      window.electron.ipcRenderer.send('updateTrayMenu')
    }
  }

  const updateProfileItem = async (item: ProfileItem): Promise<void> => {
    try {
      await update(item)
    } catch (e) {
      alert(e)
    } finally {
      mutateProfileConfig()
      window.electron.ipcRenderer.send('updateTrayMenu')
    }
  }

  const changeCurrentProfile = async (id: string): Promise<void> => {
    try {
      await change(id)
    } catch (e) {
      alert(e)
    } finally {
      mutateProfileConfig()
      window.electron.ipcRenderer.send('updateTrayMenu')
    }
  }

  // 默认订阅处理标记
  const defaultSubscriptionProcessing = useRef(false)

  // 确保默认免费订阅始终存在且在末尾
  useEffect(() => {
    if (!profileConfig || defaultSubscriptionProcessing.current) return

    const items = profileConfig.items || []
    const defaultProfileIndex = items.findIndex((item) => item.id === DEFAULT_FREE_PROFILE.id)
    const isAtEnd = items.length > 0 && defaultProfileIndex === items.length - 1

    // 如果默认订阅不存在，添加到末尾
    if (defaultProfileIndex === -1) {
      defaultSubscriptionProcessing.current = true
      add(DEFAULT_FREE_PROFILE)
        .then(() => {
          mutateProfileConfig()
          window.electron.ipcRenderer.send('updateTrayMenu')
        })
        .catch((e) => {
          console.error('默认订阅初始化失败:', e)
        })
        .finally(() => {
          defaultSubscriptionProcessing.current = false
        })
    }
    // 如果默认订阅存在但不在末尾，移动到末尾
    else if (!isAtEnd) {
      defaultSubscriptionProcessing.current = true
      const defaultProfile = items[defaultProfileIndex]
      const newItems = items.filter((item) => item.id !== DEFAULT_FREE_PROFILE.id)
      newItems.push(defaultProfile)
      set({ ...profileConfig, items: newItems })
        .then(() => {
          mutateProfileConfig()
          window.electron.ipcRenderer.send('updateTrayMenu')
        })
        .catch((e) => {
          console.error('移动默认订阅失败:', e)
        })
        .finally(() => {
          defaultSubscriptionProcessing.current = false
        })
    }
  }, [profileConfig])

  useEffect(() => {
    window.electron.ipcRenderer.on('profileConfigUpdated', () => {
      mutateProfileConfig()
    })
    return (): void => {
      window.electron.ipcRenderer.removeAllListeners('profileConfigUpdated')
    }
  }, [])

  return (
    <ProfileConfigContext.Provider
      value={{
        profileConfig,
        setProfileConfig,
        mutateProfileConfig,
        addProfileItem,
        removeProfileItem,
        updateProfileItem,
        changeCurrentProfile
      }}
    >
      {children}
    </ProfileConfigContext.Provider>
  )
}

export const useProfileConfig = (): ProfileConfigContextType => {
  const context = useContext(ProfileConfigContext)
  if (context === undefined) {
    throw new Error('useProfileConfig must be used within a ProfileConfigProvider')
  }
  return context
}
