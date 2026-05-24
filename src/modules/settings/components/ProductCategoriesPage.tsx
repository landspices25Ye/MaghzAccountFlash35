import React, { useState } from 'react';
import { FolderTree, Plus, Pencil, Trash2, ChevronRight, ChevronDown, CheckSquare } from 'lucide-react';
import { Card, Button, Modal, Input } from '@/core/ui/components';
import { useProductCategories } from '@/modules/inventory/hooks/useInventory';
import { useAppStore } from '@/core/store';

interface CategoryNode {
  id: string;
  name: string;
  parentId?: string;
  children: CategoryNode[];
}

function buildTree(categories: { id: string; name: string; parentId?: string | null }[]): CategoryNode[] {
  const map: Record<string, CategoryNode> = {};
  const roots: CategoryNode[] = [];
  categories.forEach(c => {
    map[c.id] = { id: c.id, name: c.name, parentId: c.parentId || undefined, children: [] };
  });
  categories.forEach(c => {
    if (c.parentId && map[c.parentId]) {
      map[c.parentId].children.push(map[c.id]);
    } else {
      roots.push(map[c.id]);
    }
  });
  return roots;
}

function TreeNode({ node, level, onEdit, onDelete }: { node: CategoryNode; level: number; onEdit: (n: CategoryNode) => void; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div>
      <div className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 ${level > 0 ? 'mr-6 border-r border-slate-200 dark:border-slate-700' : ''}`}>
        {node.children.length > 0 && (
          <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
        <FolderTree size={16} className="text-amber-500" />
        <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">{node.name}</span>
        <span className="text-xs text-slate-400">{node.children.length} تصنيف فرعي</span>
        <Button size="sm" variant="ghost" onClick={() => onEdit(node)} leftIcon={<Pencil size={12} />} />
        <Button size="sm" variant="ghost" onClick={() => onDelete(node.id)} leftIcon={<Trash2 size={12} className="text-rose-500" />} />
      </div>
      {expanded && node.children.length > 0 && (
        <div className="mr-3">
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} level={level + 1} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

export const ProductCategoriesPage: React.FC = () => {
  const activeCompany = useAppStore(state => state.activeCompany);
  const { categories, isLoading, create, update, remove } = useProductCategories(activeCompany?.id || '');
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', parentId: '' });

  const tree = buildTree(categories);

  const handleSave = async () => {
    if (!form.name || !activeCompany?.id) return;
    if (editingId) {
      await update(editingId, { name: form.name, parentId: form.parentId || undefined });
    } else {
      await create({ companyId: activeCompany.id, name: form.name, parentId: form.parentId || undefined });
    }
    setIsOpen(false);
    setForm({ name: '', parentId: '' });
    setEditingId(null);
  };

  const openEdit = (node: CategoryNode) => {
    setForm({ name: node.name, parentId: node.parentId || '' });
    setEditingId(node.id);
    setIsOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderTree size={28} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">تصنيفات المنتجات</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">شجرة متداخلة لتصنيف المنتجات</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => { setForm({ name: '', parentId: '' }); setEditingId(null); setIsOpen(true); }}>تصنيف جديد</Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">جارٍ التحميل...</div>
        ) : tree.length === 0 ? (
          <div className="p-8 text-center text-slate-400">لا توجد تصنيفات</div>
        ) : (
          <div className="space-y-1">
            {tree.map(node => (
              <TreeNode key={node.id} node={node} level={0} onEdit={openEdit} onDelete={remove} />
            ))}
          </div>
        )}
      </Card>

      {isOpen && (
        <Modal isOpen={isOpen} title={editingId ? 'تعديل التصنيف' : 'تصنيف جديد'} onClose={() => setIsOpen(false)} size="md">
          <div className="space-y-4">
            <Input label="اسم التصنيف *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">التصنيف الأب</label>
              <select
                value={form.parentId}
                onChange={e => setForm({ ...form, parentId: e.target.value })}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-sm"
              >
                <option value="">بدون (تصنيف رئيسي)</option>
                {categories.filter(c => c.id !== editingId).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsOpen(false)}>إلغاء</Button>
              <Button onClick={handleSave} leftIcon={<CheckSquare size={16} />}>حفظ</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ProductCategoriesPage;
