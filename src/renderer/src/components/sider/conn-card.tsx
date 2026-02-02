import { Button, Card, CardBody, CardFooter, Tooltip } from '@heroui/react'
import { FaCircleArrowDown, FaCircleArrowUp } from 'react-icons/fa6'
import { useLocation, useNavigate } from 'react-router-dom'
import { calcTraffic } from '@renderer/utils/calc'
import React, { useEffect, useState, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { IoLink } from 'react-icons/io5'
import { useAppConfig } from '@renderer/hooks/use-app-config'
import { platform } from '@renderer/utils/init'
import TrafficChart from './traffic-chart'

let currentUpload: number | undefined = undefined
let currentDownload: number | undefined = undefined
let hasShowTraffic = false
let drawing = false

interface Props {
  iconOnly?: boolean
}

const ConnCard: React.FC<Props> = (props) => {
  const { iconOnly } = props
  const { appConfig } = useAppConfig()
  const {
    showTraffic = false,
    connectionCardStatus = 'col-span-2',
    disableAnimation = false
  } = appConfig || {}
  const showTrafficRef = useRef(showTraffic)
  showTrafficRef.current = showTraffic

  const location = useLocation()
  const navigate = useNavigate()
  const match = location.pathname.includes('/connections')

  const [upload, setUpload] = useState(0)
  const [download, setDownload] = useState(0)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform: tf,
    transition,
    isDragging
  } = useSortable({
    id: 'connection'
  })
  const [trafficData, setTrafficData] = useState(() =>
    Array(10)
      .fill(0)
      .map((v, i) => ({ traffic: v, index: i }))
  )
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const transform = tf ? { x: tf.x, y: tf.y, scaleX: 1, scaleY: 1 } : null

  useEffect(() => {
    const handleTraffic = async (_e: unknown, info: ControllerTraffic): Promise<void> => {
      setUpload(info.up)
      setDownload(info.down)

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }

      updateTimeoutRef.current = setTimeout(() => {
        setTrafficData((prev) => {
          const newData = [...prev]
          newData.shift()
          newData.push({ traffic: info.up + info.down, index: Date.now() })
          return newData
        })
        updateTimeoutRef.current = null
      }, 100)

      if (platform === 'darwin' && showTrafficRef.current) {
        if (drawing) return
        drawing = true
        try {
          await drawSvg(info.up, info.down)
          hasShowTraffic = true
        } catch {
          // ignore
        } finally {
          drawing = false
        }
      } else {
        if (!hasShowTraffic) return
        window.electron.ipcRenderer.send('trayIconUpdate', trayIconBase64)
        hasShowTraffic = false
      }
    }

    window.electron.ipcRenderer.on('mihomoTraffic', handleTraffic)

    return (): void => {
      window.electron.ipcRenderer.removeAllListeners('mihomoTraffic')
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [])

  if (iconOnly) {
    return (
      <div className={`${connectionCardStatus} flex justify-center`}>
        <Tooltip content="连接" placement="right">
          <Button
            size="sm"
            isIconOnly
            color={match ? 'primary' : 'default'}
            variant={match ? 'solid' : 'light'}
            onPress={() => {
              navigate('/connections')
            }}
          >
            <IoLink className="text-[20px]" />
          </Button>
        </Tooltip>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 'calc(infinity)' : undefined
      }}
      className={`${connectionCardStatus} conn-card`}
    >
      {connectionCardStatus === 'col-span-2' ? (
        <>
          <Card
            fullWidth
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            className={`${match ? 'bg-primary' : 'hover:bg-primary/30'} ${isDragging ? `${disableAnimation ? '' : 'scale-[0.95]'} tap-highlight-transparent` : ''} relative overflow-hidden`}
          >
            <CardBody className="pb-1 pt-0 px-0 overflow-y-visible">
              <div className="flex justify-between">
                <Button
                  isIconOnly
                  className="bg-transparent pointer-events-none"
                  variant="flat"
                  color="default"
                >
                  <IoLink
                    color="default"
                    className={`${match ? 'text-primary-foreground' : 'text-foreground'} text-[24px]`}
                  />
                </Button>
                <div
                  className={`p-2 w-full ${match ? 'text-primary-foreground' : 'text-foreground'} `}
                >
                  <div className="flex justify-between">
                    <div className="w-full text-right mr-2">{calcTraffic(upload)}/s</div>
                    <FaCircleArrowUp className="h-[24px] leading-[24px]" />
                  </div>
                  <div className="flex justify-between">
                    <div className="w-full text-right mr-2">{calcTraffic(download)}/s</div>
                    <FaCircleArrowDown className="h-[24px] leading-[24px]" />
                  </div>
                </div>
              </div>
            </CardBody>
            <CardFooter className="pt-1 relative z-10">
              <div
                className={`flex justify-between items-center w-full text-md font-bold ${match ? 'text-primary-foreground' : 'text-foreground'}`}
              >
                <h3>连接</h3>
              </div>
            </CardFooter>
            <TrafficChart data={trafficData} isActive={match} />
          </Card>
        </>
      ) : (
        <Card
          fullWidth
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          className={`${match ? 'bg-primary' : 'hover:bg-primary/30'} ${isDragging ? `${disableAnimation ? '' : 'scale-[0.95]'} tap-highlight-transparent` : ''}`}
        >
          <CardBody className="pb-1 pt-0 px-0 overflow-y-visible">
            <div className="flex justify-between">
              <Button
                isIconOnly
                className="bg-transparent pointer-events-none"
                variant="flat"
                color="default"
              >
                <IoLink
                  color="default"
                  className={`${match ? 'text-primary-foreground' : 'text-foreground'} text-[24px] font-bold`}
                />
              </Button>
            </div>
          </CardBody>
          <CardFooter className="pt-1">
            <h3
              className={`text-md font-bold ${match ? 'text-primary-foreground' : 'text-foreground'}`}
            >
              连接
            </h3>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}

export default React.memo(ConnCard, (prevProps, nextProps) => {
  return prevProps.iconOnly === nextProps.iconOnly
})

const drawSvg = async (upload: number, download: number): Promise<void> => {
  if (upload === currentUpload && download === currentDownload) return
  currentUpload = upload
  currentDownload = download
  const svg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 36"><image height="36" width="36" href="${trayIconBase64}"/><text x="140" y="15" font-size="18" font-family="PingFang SC" font-weight="bold" text-anchor="end">↑ ${calcTraffic(upload)}/s</text><text x="140" y="34" font-size="18" font-family="PingFang SC" font-weight="bold" text-anchor="end">↓ ${calcTraffic(download)}/s</text></svg>`
  const image = await loadImage(svg)
  window.electron.ipcRenderer.send('trayIconUpdate', image)
}

const loadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = (): void => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = 156
      canvas.height = 36
      ctx?.drawImage(img, 0, 0)
      const png = canvas.toDataURL('image/png')
      resolve(png)
    }
    img.onerror = (): void => {
      reject()
    }
    img.src = url
  })
}

const trayIconBase64 = `data:image/png;base64,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`
