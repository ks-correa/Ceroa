package com.ceroa.service;
import com.ceroa.api.dto.DocumentContracts.*;
import com.ceroa.api.dto.DocumentFactContracts.Analysis;
import java.util.*;

/** Limit evidence text, never silently trim a number, quote or coverage flag. */
public final class DocumentQueryBudget {
    private DocumentQueryBudget() {}
    public static int characters(Result result){
        int count=result.sources().stream().mapToInt(s->s.content().length()).sum();
        if(result.verifiedData() instanceof Map<?,?> data&&data.get("analysis") instanceof Analysis a)count+=a.facts().stream().mapToInt(f->f.quote().length()).sum();
        return count;
    }
    public static Result bound(Result result,int remaining){
        if(characters(result)<=remaining)return result;
        var data=new LinkedHashMap<String,Object>();if(result.verifiedData() instanceof Map<?,?> old)old.forEach((k,v)->data.put(k.toString(),v));
        data.put("complete",false);data.put("contentTruncated",true);data.put("contextBudgetExceeded",true);
        if(data.get("analysis") instanceof Analysis)data.put("analysis",new Analysis(List.of(),List.of(),List.of(),false,List.of("CONTEXT_BUDGET_EXCEEDED_REFINE_FILTERS")));
        var kept=new ArrayList<Source>();int count=0;
        for(var source:result.sources())if(count+source.content().length()<=remaining){kept.add(source);count+=source.content().length();}
        return new Result("Cobertura parcial por presupuesto de contexto. Acota los documentos o períodos; no afirmes un total completo.",data,result.appliedFilters(),List.copyOf(kept),result.documents(),"PARTIAL",result.traceId(),result.elapsedMs());
    }
}
