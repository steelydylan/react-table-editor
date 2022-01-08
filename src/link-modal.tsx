import React, { useEffect, useState } from "react"

type Props = {
  onClose: () => void
  isNewLink: boolean
  showTargetBlankUI: boolean
  onInsertLink: (props: { linkUrl: string, linkLabel: string, linkTargetBlank: boolean }) => void
  linkUrl: string
  linkLabel: string
  message: {
    addLinkTitle: string
    updateLinkTitle: string
    linkUrl: string
    linkLabel: string
    addLink: string
    targetBlank: string
    targetBlankLabel: string
  }
}

export const LinkModal: React.FC<Props> = ({ 
  onClose, 
  isNewLink, 
  showTargetBlankUI,
  message,
  onInsertLink,
  linkLabel: defaultLinkLabel,
}) => {
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  const [linkTargetBlank, setLinkTargetBlank] = useState(false)

  useEffect(() => {
    setLinkLabel(defaultLinkLabel)
  }, [defaultLinkLabel])

  const handleToggleTargetBlank = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setLinkTargetBlank(true)
    } else {
      setLinkTargetBlank(false)
    }
  }

  return (
    <div className="st-table-modal-wrap">
      <div className="st-table-modal-outer">
        <div className="st-table-modal-inner">
          <div className="st-table-modal-content">
            <span className="st-table-close-btn-wrap">
              <button
                type="button"
                onClick={onClose}
                className="st-table-close-btn"
              >
                <i className="st-table-close-btn-icon"></i>
              </button>
            </span>
            {isNewLink && (
              <h2 className="st-table-modal-title">
                <i className="st-table-modal-title-icon"></i>
                {message.addLinkTitle}
              </h2>
            )}
            {!isNewLink && (
              <h2 className="st-table-modal-title">
                <i className="st-table-modal-title-icon"></i>
                {message.updateLinkTitle}
              </h2>
            )}
            <div className="st-table-modal-body">
              <table className="st-table-modal-table">
                <tbody>
                  <tr>
                    <td>
                      <label className="st-table-link-label">{message.linkUrl}</label>
                      <input
                        type="text"
                        className="st-table-modal-input"
                        value={linkUrl}
                        onChange={e => {
                          setLinkUrl(e.target.value)
                        }}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <label className="st-table-link-label">{message.linkLabel}</label>
                      <input
                        type="text"
                        className="st-table-modal-input"
                        defaultValue={linkLabel}
                        onChange={e => {
                          setLinkLabel(e.target.value)
                        }}
                      />
                    </td>
                  </tr>
                  {showTargetBlankUI && (
                    <tr>
                      <th>{message.targetBlank}</th>
                      <td>
                        <label>
                          <input
                            type="checkbox"
                            value="true"
                            checked={linkTargetBlank}
                            onChange={handleToggleTargetBlank}
                          />
                          {message.targetBlankLabel}
                        </label>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="st-table-link-action">
                      <button
                        type="button"
                        onClick={onClose}
                        className="st-table-modal-btn st-table-modal-cancel-btn"
                      >
                        キャンセル
                      </button>
                      {isNewLink && (
                        <button
                          type="button"
                          onClick={() => {
                            onInsertLink({ linkLabel, linkUrl, linkTargetBlank })
                          }}
                          className="st-table-modal-btn"
                        >
                          <i className="st-table-modal-link-icon"></i>
                          {message.addLink}
                        </button>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
