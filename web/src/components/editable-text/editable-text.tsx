import { useState, useRef, useEffect } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import { Input } from 'antd';
import type { InputRef } from 'antd';

interface editable_text_props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  textStyle?: CSSProperties;
  inputStyle?: CSSProperties;
  onEditStart?: () => void;
  onEditEnd?: () => void;
}

/**
 * 可内联编辑的 span / input 切换组件。
 */
export default function EditableText({
  value,
  onChange,
  placeholder = "未命名",
  textStyle = { fontSize: '16px', fontWeight: 600, width: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  inputStyle = { width: '90%' },
  onEditStart,
  onEditEnd,
}: editable_text_props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const input_ref = useRef<InputRef>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && input_ref.current) {
      input_ref.current.focus();
      input_ref.current.select();
    }
  }, [isEditing]);

  const save_edit = () => {
    const trimmed = editValue.trim();
    if (trimmed !== value) {
      onChange(trimmed);
    }
    setIsEditing(false);
    onEditEnd?.();
  };

  const cancel_edit = () => {
    setEditValue(value);
    setIsEditing(false);
    onEditEnd?.();
  };

  const handle_key_down = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') save_edit();
    else if (e.key === 'Escape') cancel_edit();
  };

  const handle_click = (e: MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    if (!isEditing) {
      setIsEditing(true);
      onEditStart?.();
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={input_ref}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handle_key_down}
        onBlur={save_edit}
        style={inputStyle}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', ...textStyle }}
      onClick={handle_click}
    >
      {editValue || placeholder}
    </span>
  );
}
