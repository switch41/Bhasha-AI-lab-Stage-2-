   {llmConnections?.filter(c => c.isActive).map((conn) => (
     <SelectItem key={conn._id} value={conn._id}>
       {conn.name} (Custom)
     </SelectItem>
   ))}
   